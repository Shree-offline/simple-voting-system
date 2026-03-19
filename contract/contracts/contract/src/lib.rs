#![no_std]

use soroban_sdk::{contract, contractimpl, symbol_short, Env, Symbol, Vec};

#[contract]
pub struct VotingContract;

// Storage keys
const CANDIDATES: Symbol = symbol_short!("CANDS");
const VOTES: Symbol = symbol_short!("VOTES");

#[contractimpl]
impl VotingContract {

    // Initialize candidates
    pub fn init(env: Env, candidates: Vec<Symbol>) {
        if env.storage().instance().has(&CANDIDATES) {
            panic!("Already initialized");
        }

        let mut votes: Vec<(Symbol, u32)> = Vec::new(&env);

        for candidate in candidates.iter() {
            votes.push_back((candidate.clone(), 0));
        }

        env.storage().instance().set(&CANDIDATES, &candidates);
        env.storage().instance().set(&VOTES, &votes);
    }

    // Vote for a candidate
    pub fn vote(env: Env, candidate: Symbol) {
        let mut votes: Vec<(Symbol, u32)> =
            env.storage().instance().get(&VOTES).unwrap();

        let mut found = false;

        for i in 0..votes.len() {
            let (name, count) = votes.get(i).unwrap();
            if name == candidate {
                votes.set(i, (name, count + 1));
                found = true;
                break;
            }
        }

        if !found {
            panic!("Candidate not found");
        }

        env.storage().instance().set(&VOTES, &votes);
    }

    // Get current results
    pub fn get_results(env: Env) -> Vec<(Symbol, u32)> {
        env.storage().instance().get(&VOTES).unwrap()
    }
}