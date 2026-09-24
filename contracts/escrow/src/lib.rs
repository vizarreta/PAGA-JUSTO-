#![no_std]

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, panic_with_error,
    symbol_short, token, Address, Bytes, BytesN, Env, Vec};

pub const XLM_TESTNET: &str = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";
const NETWORK: &[u8] = b"Test SDF Network ; September 2015";
const TTL_THRESHOLD: u32 = 17_280 * 7;
const TTL_EXTEND: u32 = 17_280 * 30;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    WrongNetwork = 1, InvalidTerms = 2, Unauthorized = 3, WrongState = 4,
    WrongVersion = 5, NotAccepted = 6, WrongMilestone = 7,
    InvalidAmount = 8, StaleProposal = 9, SameProposer = 10,
    MissingState = 11, AdjustmentLimit = 12,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum Status { Created, Active, InResolution, Completed, ClosedBySettlement }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum MilestoneStatus { Pending, Submitted, ChangesRequested, Paid }

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Milestone {
    pub amount: i128,
    pub status: MilestoneStatus,
    pub submission: u32,
    pub changes: u32,
    pub evidence_hash: Option<BytesN<32>>,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Settlement {
    pub id: u32,
    pub proposer: Address,
    pub client_amount: i128,
    pub freelancer_amount: i128,
    pub reference_balance: i128,
    pub terms_version: u32,
}

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Agreement {
    pub client: Address,
    pub freelancer: Address,
    pub token: Address,
    pub terms_hash: BytesN<32>,
    pub version: u32,
    pub total: i128,
    pub deposited: i128,
    pub pending: i128,
    pub paid: i128,
    pub refunded: i128,
    pub client_accepted: bool,
    pub freelancer_accepted: bool,
    pub current: u32,
    pub milestones: Vec<Milestone>,
    pub status: Status,
    pub revision_rounds: u32,
    pub proposal_counter: u32,
    /// Empty or one current proposal. A counterproposal replaces it atomically.
    pub proposal: Vec<Settlement>,
}

#[contracttype]
#[derive(Clone)]
enum DataKey { Agreement, Evidence(u32, u32) }

#[contract]
pub struct Escrow;

fn check(env: &Env, condition: bool, error: Error) {
    if !condition { panic_with_error!(env, error); }
}

fn save(env: &Env, agreement: &Agreement) {
    // Track only the agreed deposit; unsolicited token transfers never change this ledger.
    check(env, agreement.deposited == agreement.pending + agreement.paid + agreement.refunded,
        Error::InvalidAmount);
    env.storage().persistent().set(&DataKey::Agreement, agreement);
    extend(env);
}

fn extend(env: &Env) {
    env.storage().persistent().extend_ttl(&DataKey::Agreement, TTL_THRESHOLD, TTL_EXTEND);
    env.storage().instance().extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
}

fn load(env: &Env) -> Agreement {
    let agreement = env.storage().persistent().get(&DataKey::Agreement)
        .unwrap_or_else(|| panic_with_error!(env, Error::MissingState));
    extend(env);
    agreement
}

fn participant(env: &Env, a: &Agreement, actor: &Address) {
    check(env, actor == &a.client || actor == &a.freelancer, Error::Unauthorized);
    actor.require_auth();
}

fn active_milestone(env: &Env, a: &Agreement, index: u32) -> Milestone {
    check(env, a.status == Status::Active, Error::WrongState);
    check(env, index == a.current && index < a.milestones.len(), Error::WrongMilestone);
    a.milestones.get(index).unwrap()
}

#[contractimpl]
impl Escrow {
    /// Protocol constructor executes atomically with deployment. There is no public init/reset/upgrade.
    /// Terms are immutable; changes require a new deployment and both acceptances.
    pub fn __constructor(env: Env, client: Address, freelancer: Address,
        terms_hash: BytesN<32>, version: u32, total: i128, amounts: Vec<i128>, revision_rounds: u32) {
        let expected: BytesN<32> = env.crypto().sha256(&Bytes::from_slice(&env, NETWORK)).into();
        check(&env, env.ledger().network_id() == expected, Error::WrongNetwork);
        client.require_auth();
        check(&env, client != freelancer && version > 0 && revision_rounds <= 20, Error::InvalidTerms);
        check(&env, terms_hash != BytesN::from_array(&env, &[0; 32]), Error::InvalidTerms);
        check(&env, amounts.len() > 0 && amounts.len() <= 3 && total > 0 && total <= i64::MAX as i128, Error::InvalidAmount);
        let mut sum = 0i128;
        let mut milestones = Vec::new(&env);
        for amount in amounts.iter() {
            check(&env, amount > 0 && amount <= total, Error::InvalidAmount);
            sum = sum.checked_add(amount).unwrap_or_else(|| panic_with_error!(&env, Error::InvalidAmount));
            milestones.push_back(Milestone { amount, status: MilestoneStatus::Pending,
                submission: 0, changes: 0, evidence_hash: None });
        }
        check(&env, sum == total, Error::InvalidAmount);
        let a = Agreement { client, freelancer,
            token: Address::from_str(&env, XLM_TESTNET), terms_hash, version, total,
            deposited: 0, pending: 0, paid: 0, refunded: 0,
            client_accepted: false, freelancer_accepted: false,
            current: 0, milestones, status: Status::Created, revision_rounds,
            proposal_counter: 0, proposal: Vec::new(&env) };
        save(&env, &a);
    }

    pub fn accept_agreement(env: Env, actor: Address, version: u32, terms_hash: BytesN<32>) {
        let mut a = load(&env);
        participant(&env, &a, &actor);
        check(&env, a.status == Status::Created, Error::WrongState);
        check(&env, a.version == version && a.terms_hash == terms_hash, Error::WrongVersion);
        if actor == a.client { a.client_accepted = true; } else { a.freelancer_accepted = true; }
        save(&env, &a);
        env.events().publish((symbol_short!("accepted"),), (actor, version));
    }

    pub fn fund(env: Env, actor: Address) {
        let mut a = load(&env);
        check(&env, actor == a.client, Error::Unauthorized);
        actor.require_auth();
        check(&env, a.status == Status::Created && a.deposited == 0, Error::WrongState);
        check(&env, a.client_accepted && a.freelancer_accepted, Error::NotAccepted);
        token::Client::new(&env, &a.token).transfer(&a.client, &env.current_contract_address(), &a.total);
        a.deposited = a.total;
        a.pending = a.total;
        a.status = Status::Active;
        save(&env, &a);
        env.events().publish((symbol_short!("funded"),), a.total);
    }

    pub fn submit_milestone(env: Env, actor: Address, index: u32, evidence_hash: BytesN<32>) {
        let mut a = load(&env);
        check(&env, actor == a.freelancer, Error::Unauthorized);
        actor.require_auth();
        let mut m = active_milestone(&env, &a, index);
        check(&env, m.status == MilestoneStatus::Pending || m.status == MilestoneStatus::ChangesRequested, Error::WrongState);
        check(&env, evidence_hash != BytesN::from_array(&env, &[0;32]), Error::InvalidTerms);
        m.submission += 1;
        m.evidence_hash = Some(evidence_hash.clone());
        m.status = MilestoneStatus::Submitted;
        let key = DataKey::Evidence(index, m.submission);
        env.storage().persistent().set(&key, &evidence_hash);
        env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND);
        a.milestones.set(index, m);
        save(&env, &a);
        env.events().publish((symbol_short!("submitted"),), (index, evidence_hash));
    }

    pub fn request_changes(env: Env, actor: Address, index: u32) {
        let mut a = load(&env);
        check(&env, actor == a.client, Error::Unauthorized);
        actor.require_auth();
        let mut m = active_milestone(&env, &a, index);
        check(&env, m.status == MilestoneStatus::Submitted, Error::WrongState);
        check(&env, m.changes < a.revision_rounds, Error::AdjustmentLimit);
        m.changes += 1;
        m.status = MilestoneStatus::ChangesRequested;
        a.milestones.set(index, m);
        save(&env, &a);
        env.events().publish((symbol_short!("changes"),), index);
    }

    pub fn approve_and_release(env: Env, actor: Address, index: u32) {
        let mut a = load(&env);
        check(&env, actor == a.client, Error::Unauthorized);
        actor.require_auth();
        let mut m = active_milestone(&env, &a, index);
        check(&env, m.status == MilestoneStatus::Submitted, Error::WrongState);
        token::Client::new(&env, &a.token).transfer(&env.current_contract_address(), &a.freelancer, &m.amount);
        a.paid += m.amount;
        a.pending -= m.amount;
        m.status = MilestoneStatus::Paid;
        a.milestones.set(index, m.clone());
        a.current += 1;
        if a.current == a.milestones.len() { a.status = Status::Completed; }
        save(&env, &a);
        env.events().publish((symbol_short!("paid"),), (index, m.amount, a.freelancer));
    }

    pub fn open_resolution(env: Env, actor: Address) {
        let mut a = load(&env);
        participant(&env, &a, &actor);
        check(&env, a.status == Status::Active && a.pending > 0, Error::WrongState);
        a.status = Status::InResolution;
        save(&env, &a);
        env.events().publish((symbol_short!("review"),), actor);
    }

    pub fn propose_settlement(env: Env, actor: Address, expected_counter: u32,
        client_amount: i128, freelancer_amount: i128) -> u32 {
        let mut a = load(&env);
        participant(&env, &a, &actor);
        check(&env, a.status == Status::InResolution, Error::WrongState);
        check(&env, expected_counter == a.proposal_counter, Error::StaleProposal);
        check(&env, client_amount >= 0 && freelancer_amount >= 0 && client_amount <= a.pending &&
            freelancer_amount <= a.pending && client_amount + freelancer_amount == a.pending, Error::InvalidAmount);
        a.proposal_counter += 1;
        a.proposal = Vec::from_array(&env, [Settlement { id: a.proposal_counter, proposer: actor,
            client_amount, freelancer_amount, reference_balance: a.pending, terms_version: a.version }]);
        save(&env, &a);
        env.events().publish((symbol_short!("proposal"),), a.proposal.get(0).unwrap());
        a.proposal_counter
    }

    pub fn accept_settlement(env: Env, actor: Address, proposal_id: u32,
        client_amount: i128, freelancer_amount: i128) {
        let mut a = load(&env);
        participant(&env, &a, &actor);
        check(&env, a.status == Status::InResolution, Error::WrongState);
        let p = a.proposal.get(0).unwrap_or_else(|| panic_with_error!(&env, Error::StaleProposal));
        check(&env, p.id == proposal_id && p.client_amount == client_amount &&
            p.freelancer_amount == freelancer_amount && p.reference_balance == a.pending && p.terms_version == a.version, Error::StaleProposal);
        check(&env, actor != p.proposer, Error::SameProposer);
        let token = token::Client::new(&env, &a.token);
        let escrow = env.current_contract_address();
        // Any failing transfer aborts the invocation, including preceding transfers and storage writes.
        if client_amount > 0 { token.transfer(&escrow, &a.client, &client_amount); }
        if freelancer_amount > 0 { token.transfer(&escrow, &a.freelancer, &freelancer_amount); }
        a.refunded += client_amount;
        a.paid += freelancer_amount;
        a.pending = 0;
        a.status = Status::ClosedBySettlement;
        save(&env, &a);
        env.events().publish((symbol_short!("closed"),), (proposal_id, client_amount, freelancer_amount));
    }

    pub fn get_agreement(env: Env) -> Agreement { load(&env) }

    pub fn get_evidence(env: Env, index: u32, submission: u32) -> Option<BytesN<32>> {
        let key = DataKey::Evidence(index, submission);
        let evidence = env.storage().persistent().get(&key);
        if evidence.is_some() { env.storage().persistent().extend_ttl(&key, TTL_THRESHOLD, TTL_EXTEND); }
        evidence
    }

    /// Permissionless maintenance; never grants spending rights or returns funds.
    pub fn maintain(env: Env) { let _ = load(&env); }
}

#[cfg(test)]
mod test;
