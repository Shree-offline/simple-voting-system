#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Map, String, Vec};

#[contracttype]
pub enum DataKey {
    Votes,
    Voters,
    Candidates,
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Vote for a candidate. If candidate doesn't exist, it's automatically created.
    /// Each address can only vote once.
    pub fn vote(env: Env, voter: Address, candidate: String) {
        voter.require_auth();

        // Check if voter has already voted
        let mut voters: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::Voters)
            .unwrap_or_else(|| Map::new(&env));

        if voters.get(voter.clone()).unwrap_or(false) {
            panic!("already voted");
        }

        // Mark voter as voted
        voters.set(voter.clone(), true);
        env.storage().instance().set(&DataKey::Voters, &voters);

        // Update votes
        let mut votes: Map<String, u32> = env
            .storage()
            .instance()
            .get(&DataKey::Votes)
            .unwrap_or_else(|| Map::new(&env));

        let count = votes.get(candidate.clone()).unwrap_or(0);
        votes.set(candidate.clone(), count + 1);
        env.storage().instance().set(&DataKey::Votes, &votes);

        // Track candidate list if new
        let mut candidates: Vec<String> = env
            .storage()
            .instance()
            .get(&DataKey::Candidates)
            .unwrap_or_else(|| Vec::new(&env));

        if !candidates.contains(&candidate) {
            candidates.push_back(candidate);
            env.storage()
                .instance()
                .set(&DataKey::Candidates, &candidates);
        }
    }

    /// Get vote count for a candidate
    pub fn get_votes(env: Env, candidate: String) -> u32 {
        let votes: Map<String, u32> = env
            .storage()
            .instance()
            .get(&DataKey::Votes)
            .unwrap_or_else(|| Map::new(&env));
        votes.get(candidate).unwrap_or(0)
    }

    /// Get all candidates that have received at least one vote
    pub fn get_all_candidates(env: Env) -> Vec<String> {
        env.storage()
            .instance()
            .get(&DataKey::Candidates)
            .unwrap_or_else(|| Vec::new(&env))
    }

    /// Check if an address has voted
    pub fn has_voted(env: Env, voter: Address) -> bool {
        let voters: Map<Address, bool> = env
            .storage()
            .instance()
            .get(&DataKey::Voters)
            .unwrap_or_else(|| Map::new(&env));
        voters.get(voter).unwrap_or(false)
    }
}

mod test;
