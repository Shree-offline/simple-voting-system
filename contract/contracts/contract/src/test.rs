#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Env, String};

#[test]
fn test_permissionless_voting() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // No add_candidate needed - voting creates candidates automatically
    client.vote(&user1, &String::from_str(&env, "Alice"));
    client.vote(&user2, &String::from_str(&env, "Bob"));

    assert_eq!(client.get_votes(&String::from_str(&env, "Alice")), 1);
    assert_eq!(client.get_votes(&String::from_str(&env, "Bob")), 1);
}

#[test]
fn test_prevent_double_voting() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);

    // Vote for any candidate (auto-created)
    client.vote(&user1, &String::from_str(&env, "Alice"));
    assert_eq!(client.get_votes(&String::from_str(&env, "Alice")), 1);

    // Try to vote again using try_ - should fail
    let result = client.try_vote(&user1, &String::from_str(&env, "Alice"));
    assert!(result.is_err());
}

#[test]
fn test_get_all_candidates() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);

    // Create candidates by voting
    client.vote(&user1, &String::from_str(&env, "Charlie"));
    client.vote(&user2, &String::from_str(&env, "Diana"));

    let candidates = client.get_all_candidates();
    assert_eq!(candidates.len(), 2);
    assert_eq!(candidates.get(0), Some(String::from_str(&env, "Charlie")));
    assert_eq!(candidates.get(1), Some(String::from_str(&env, "Diana")));
}

#[test]
fn test_multiple_votes_per_candidate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);
    let user2 = Address::generate(&env);
    let user3 = Address::generate(&env);

    // All vote for same candidate (auto-created)
    client.vote(&user1, &String::from_str(&env, "Eve"));
    client.vote(&user2, &String::from_str(&env, "Eve"));
    client.vote(&user3, &String::from_str(&env, "Eve"));

    assert_eq!(client.get_votes(&String::from_str(&env, "Eve")), 3);
}

#[test]
fn test_vote_nonexistent_candidate() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let user1 = Address::generate(&env);

    // Voting for non-existent candidate should create entry with 1 vote
    client.vote(&user1, &String::from_str(&env, "Nobody"));

    // Now it exists with 1 vote
    assert_eq!(client.get_votes(&String::from_str(&env, "Nobody")), 1);
}

#[test]
fn test_check_voter_status() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(Contract, ());
    let client = ContractClient::new(&env, &contract_id);

    let voter = Address::generate(&env);
    let non_voter = Address::generate(&env);

    // Voter hasn't voted yet
    assert!(!client.has_voted(&voter));
    assert!(!client.has_voted(&non_voter));

    // After voting
    client.vote(&voter, &String::from_str(&env, "Alice"));
    assert!(client.has_voted(&voter));
    assert!(!client.has_voted(&non_voter));
}
