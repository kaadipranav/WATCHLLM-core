ALTER TABLE simulations ADD COLUMN parent_sim_id TEXT REFERENCES simulations(id);
ALTER TABLE simulations ADD COLUMN fork_node_id TEXT;
