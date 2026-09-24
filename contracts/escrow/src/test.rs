use super::*;
use soroban_sdk::{contract, contractimpl, contracttype, testutils::{Address as _, Ledger}, vec};

// A failure-injectable SEP-41 test double at the fixed Testnet XLM address.
// Real native SAC behavior is checked separately by scripts/testnet-demo.cjs.
#[contract]
struct TestToken;
#[contracttype]
#[derive(Clone)]
enum TokenKey { Balance(Address), FailTo(Address) }
#[contractimpl]
impl TestToken {
    pub fn mint(env: Env, to: Address, amount: i128) {
        env.storage().instance().set(&TokenKey::Balance(to.clone()), &(Self::balance(env.clone(), to) + amount));
    }
    pub fn balance(env: Env, who: Address) -> i128 {
        env.storage().instance().get(&TokenKey::Balance(who)).unwrap_or(0)
    }
    pub fn fail_to(env: Env, who: Address) { env.storage().instance().set(&TokenKey::FailTo(who), &true); }
    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        assert!(amount >= 0 && !env.storage().instance().get::<_, bool>(&TokenKey::FailTo(to.clone())).unwrap_or(false));
        let balance = Self::balance(env.clone(), from.clone());
        assert!(balance >= amount, "insufficient balance");
        env.storage().instance().set(&TokenKey::Balance(from), &(balance - amount));
        env.storage().instance().set(&TokenKey::Balance(to.clone()), &(Self::balance(env.clone(), to) + amount));
    }
}

const X: i128 = 10_000_000;
struct Setup { env: Env, client: Address, freelancer: Address, id: Address, token: Address, hash: BytesN<32> }
impl Setup {
    fn new() -> Self {
        let env = Env::default();
        env.mock_all_auths();
        let network: BytesN<32> = env.crypto().sha256(&Bytes::from_slice(&env, NETWORK)).into();
        env.ledger().with_mut(|info| { info.network_id = network.to_array(); info.protocol_version = 25; });
        let client = Address::generate(&env);
        let freelancer = Address::generate(&env);
        let hash = BytesN::from_array(&env, &[7; 32]);
        let id = env.register(Escrow, (client.clone(), freelancer.clone(), hash.clone(), 1u32, 100 * X,
            vec![&env, 30 * X, 40 * X, 30 * X], 2u32));
        let token = Address::from_str(&env, XLM_TESTNET);
        env.register_at(&token, TestToken, ());
        TestTokenClient::new(&env, &token).mint(&client, &(1000 * X));
        Self { env, client, freelancer, id, token, hash }
    }
    fn escrow(&self) -> EscrowClient<'_> { EscrowClient::new(&self.env, &self.id) }
    fn token(&self) -> TestTokenClient<'_> { TestTokenClient::new(&self.env, &self.token) }
    fn accept(&self) {
        self.escrow().accept_agreement(&self.client, &1, &self.hash);
        self.escrow().accept_agreement(&self.freelancer, &1, &self.hash);
    }
    fn fund(&self) { self.accept(); self.escrow().fund(&self.client); }
    fn submit(&self, index: u32) { self.escrow().submit_milestone(&self.freelancer, &index, &self.hash); }
    fn conserved(&self) {
        let a = self.escrow().get_agreement();
        assert_eq!(a.deposited, a.pending + a.paid + a.refunded);
        assert!(a.pending >= 0 && a.paid >= 0 && a.refunded >= 0);
    }
}

#[test]
fn demo_100_deposit_30_payment_70_pending_and_bilateral_close() {
    let s = Setup::new(); s.fund(); s.submit(0);
    s.escrow().approve_and_release(&s.client, &0);
    let a = s.escrow().get_agreement();
    assert_eq!((a.deposited, a.paid, a.pending), (100 * X, 30 * X, 70 * X));
    assert_eq!(s.token().balance(&s.freelancer), 30 * X);
    s.escrow().open_resolution(&s.freelancer);
    let id = s.escrow().propose_settlement(&s.client, &0, &(20 * X), &(50 * X));
    s.escrow().accept_settlement(&s.freelancer, &id, &(20 * X), &(50 * X));
    let closed = s.escrow().get_agreement();
    assert_eq!(closed.status, Status::ClosedBySettlement);
    assert_eq!((closed.pending, closed.paid, closed.refunded), (0, 80 * X, 20 * X));
    assert_eq!(s.token().balance(&s.id), 0);
    assert_eq!(s.token().balance(&s.client), 920 * X);
    assert_eq!(s.token().balance(&s.freelancer), 80 * X);
    s.conserved();
}

#[test]
fn both_parties_accept_the_exact_version_and_hash() {
    let s = Setup::new();
    assert!(s.escrow().try_fund(&s.client).is_err());
    assert!(s.escrow().try_accept_agreement(&s.client, &2, &s.hash).is_err());
    assert!(s.escrow().try_accept_agreement(&s.client, &1, &BytesN::from_array(&s.env, &[8;32])).is_err());
    s.escrow().accept_agreement(&s.client, &1, &s.hash);
    assert!(s.escrow().try_fund(&s.client).is_err());
    s.escrow().accept_agreement(&s.freelancer, &1, &s.hash);
    s.escrow().fund(&s.client); s.conserved();
}

#[test]
fn unknown_wallet_cannot_accept_fund_or_submit() {
    let s = Setup::new(); let stranger = Address::generate(&s.env);
    assert!(s.escrow().try_accept_agreement(&stranger, &1, &s.hash).is_err());
    s.accept();
    assert!(s.escrow().try_fund(&stranger).is_err());
    s.escrow().fund(&s.client);
    assert!(s.escrow().try_submit_milestone(&stranger, &0, &s.hash).is_err());
    assert!(s.escrow().try_open_resolution(&stranger).is_err());
}

#[test]
fn passing_the_clients_address_without_authorization_is_not_enough() {
    let s = Setup::new(); s.accept();
    s.env.mock_auths(&[]);
    assert!(s.escrow().try_fund(&s.client).is_err());
    assert_eq!(s.escrow().get_agreement().deposited, 0);
}

#[test]
fn deposit_is_accepted_only_once() {
    let s = Setup::new(); s.fund();
    assert!(s.escrow().try_fund(&s.client).is_err());
    assert_eq!(s.token().balance(&s.id), 100 * X); s.conserved();
}

#[test]
fn only_active_milestone_can_be_submitted_or_paid() {
    let s = Setup::new(); s.fund();
    assert!(s.escrow().try_submit_milestone(&s.freelancer, &1, &s.hash).is_err());
    assert!(s.escrow().try_approve_and_release(&s.client, &0).is_err());
    s.submit(0);
    assert!(s.escrow().try_approve_and_release(&s.client, &1).is_err());
    assert!(s.escrow().try_submit_milestone(&s.client, &0, &s.hash).is_err());
}

#[test]
fn freelancer_cannot_release_own_payment_and_payment_cannot_repeat() {
    let s = Setup::new(); s.fund(); s.submit(0);
    assert!(s.escrow().try_approve_and_release(&s.freelancer, &0).is_err());
    s.escrow().approve_and_release(&s.client, &0);
    assert!(s.escrow().try_approve_and_release(&s.client, &0).is_err());
    assert_eq!(s.token().balance(&s.freelancer), 30 * X); s.conserved();
}

#[test]
fn failed_deposit_keeps_state_and_balances() {
    let s = Setup::new(); s.accept(); s.token().fail_to(&s.id);
    assert!(s.escrow().try_fund(&s.client).is_err());
    assert_eq!(s.escrow().get_agreement().status, Status::Created);
    assert_eq!(s.token().balance(&s.client), 1000 * X); s.conserved();
}

#[test]
fn failed_payment_does_not_mark_milestone_paid() {
    let s = Setup::new(); s.fund(); s.submit(0); s.token().fail_to(&s.freelancer);
    assert!(s.escrow().try_approve_and_release(&s.client, &0).is_err());
    let a = s.escrow().get_agreement();
    assert_eq!(a.milestones.get(0).unwrap().status, MilestoneStatus::Submitted);
    assert_eq!((a.paid, a.pending, a.current), (0, 100 * X, 0));
    assert_eq!(s.token().balance(&s.id), 100 * X); s.conserved();
}

#[test]
fn review_pauses_all_ordinary_actions() {
    let s = Setup::new(); s.fund(); s.submit(0); s.escrow().open_resolution(&s.client);
    assert!(s.escrow().try_approve_and_release(&s.client, &0).is_err());
    assert!(s.escrow().try_request_changes(&s.client, &0).is_err());
    assert!(s.escrow().try_submit_milestone(&s.freelancer, &0, &s.hash).is_err());
    s.conserved();
}

#[test]
fn counterproposal_invalidates_previous_id_and_proposer_cannot_accept() {
    let s = Setup::new(); s.fund(); s.escrow().open_resolution(&s.client);
    let first = s.escrow().propose_settlement(&s.client, &0, &(100 * X), &0);
    assert!(s.escrow().try_accept_settlement(&s.client, &first, &(100 * X), &0).is_err());
    let second = s.escrow().propose_settlement(&s.freelancer, &1, &(40 * X), &(60 * X));
    assert!(s.escrow().try_accept_settlement(&s.freelancer, &first, &(100 * X), &0).is_err());
    assert!(s.escrow().try_accept_settlement(&s.client, &second, &(50 * X), &(50 * X)).is_err());
    assert!(s.escrow().try_propose_settlement(&s.client, &1, &0, &(100 * X)).is_err());
    s.escrow().accept_settlement(&s.client, &second, &(40 * X), &(60 * X)); s.conserved();
    assert!(s.escrow().try_accept_settlement(&s.client, &second, &(40 * X), &(60 * X)).is_err());
}

#[test]
fn settlement_must_cover_exact_balance_without_negatives() {
    let s = Setup::new(); s.fund(); s.escrow().open_resolution(&s.client);
    assert!(s.escrow().try_propose_settlement(&s.client, &0, &(-X), &(101 * X)).is_err());
    assert!(s.escrow().try_propose_settlement(&s.client, &0, &0, &(99 * X)).is_err());
    assert!(s.escrow().try_propose_settlement(&Address::generate(&s.env), &0, &0, &(100 * X)).is_err());
}

#[test]
fn second_settlement_transfer_failure_rolls_back_first_transfer_too() {
    let s = Setup::new(); s.fund(); s.escrow().open_resolution(&s.client);
    let p = s.escrow().propose_settlement(&s.client, &0, &(40 * X), &(60 * X));
    s.token().fail_to(&s.freelancer);
    assert!(s.escrow().try_accept_settlement(&s.freelancer, &p, &(40 * X), &(60 * X)).is_err());
    assert_eq!(s.token().balance(&s.client), 900 * X);
    assert_eq!(s.token().balance(&s.id), 100 * X);
    assert_eq!(s.escrow().get_agreement().status, Status::InResolution); s.conserved();
}

#[test]
fn adjustments_keep_evidence_history_and_funds() {
    let s = Setup::new(); s.fund(); s.submit(0);
    s.escrow().request_changes(&s.client, &0);
    let second = BytesN::from_array(&s.env, &[9;32]);
    s.escrow().submit_milestone(&s.freelancer, &0, &second);
    assert_eq!(s.escrow().get_evidence(&0, &1), Some(s.hash.clone()));
    assert_eq!(s.escrow().get_evidence(&0, &2), Some(second));
    s.escrow().request_changes(&s.client, &0); s.submit(0);
    assert!(s.escrow().try_request_changes(&s.client, &0).is_err());
    assert_eq!(s.escrow().get_agreement().pending, 100 * X); s.conserved();
}

#[test]
fn all_three_milestones_complete_and_external_transfers_do_not_increase_budget() {
    let s = Setup::new(); s.fund(); s.token().mint(&s.id, &(5 * X));
    for index in 0..3 { s.submit(index); s.escrow().approve_and_release(&s.client, &index); s.conserved(); }
    let a = s.escrow().get_agreement();
    assert_eq!(a.status, Status::Completed); assert_eq!(a.paid, 100 * X);
    assert_eq!(s.token().balance(&s.id), 5 * X);
    assert!(s.escrow().try_open_resolution(&s.client).is_err());
}

#[test]
fn maintenance_does_not_release_funds() {
    let s = Setup::new(); s.fund();
    s.env.ledger().with_mut(|info| { info.sequence_number += 100; info.timestamp += 10_000_000; });
    s.escrow().maintain(); assert_eq!(s.escrow().get_agreement().pending, 100 * X); s.conserved();
}

#[test]
#[should_panic(expected = "Error(Contract, #1)")]
fn reject_mainnet_constructor() {
    let env = Env::default(); env.mock_all_auths();
    env.register(Escrow, (Address::generate(&env), Address::generate(&env), BytesN::from_array(&env, &[7;32]),
        1u32, 100i128, vec![&env, 100i128], 2u32));
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn reject_invalid_amounts() {
    let s = Setup::new();
    s.env.register(Escrow, (s.client, s.freelancer, s.hash, 1u32, 100i128, vec![&s.env, 101i128, -1i128], 2u32));
}

#[test]
#[should_panic(expected = "Error(Contract, #8)")]
fn reject_four_milestones() {
    let s = Setup::new();
    s.env.register(Escrow, (s.client, s.freelancer, s.hash, 1u32, 100i128, vec![&s.env, 25i128, 25i128, 25i128, 25i128], 2u32));
}

#[test]
#[should_panic(expected = "Error(Contract, #2)")]
fn reject_same_participant() {
    let s = Setup::new();
    s.env.register(Escrow, (s.client.clone(), s.client, s.hash, 1u32, 100i128, vec![&s.env, 100i128], 2u32));
}
