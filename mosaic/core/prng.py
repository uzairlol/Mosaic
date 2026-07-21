import random

class SeededPRNG:
    """
    Deterministic Pseudo-Random Number Generator wrapper.
    Ensures simulation steps can be perfectly replayed given the same initial seed.
    """
    def __init__(self, master_seed: int = 42):
        self.master_seed = master_seed
        self._rng = random.Random(master_seed)

    def set_seed(self, seed: int):
        self.master_seed = seed
        self._rng.seed(seed)

    def random(self) -> float:
        return self._rng.random()

    def randint(self, a: int, b: int) -> int:
        return self._rng.randint(a, b)

    def uniform(self, a: float, b: float) -> float:
        return self._rng.uniform(a, b)

    def choice(self, seq):
        return self._rng.choice(seq)

    def sample(self, population, k: int):
        return self._rng.sample(population, k)

    def shuffle(self, x):
        self._rng.shuffle(x)

    def normalvariate(self, mu: float, sigma: float) -> float:
        return self._rng.normalvariate(mu, sigma)

    def spawn_sub_stream(self, sub_key: str) -> "SeededPRNG":
        """Spawns a deterministic child PRNG stream keyed by a string (e.g. agent_id or tick)."""
        sub_seed = hash(f"{self.master_seed}_{sub_key}") % (2**31 - 1)
        return SeededPRNG(sub_seed)
