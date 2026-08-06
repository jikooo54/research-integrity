import json
from pathlib import Path


CONTRACT = str(Path(__file__).resolve().parents[2] / "backend" / "research-integrity.py")


def _mock_round(vm, tier: str, credence: int, attack: int) -> None:
    vm.mock_llm(
        r".*You are the PROSECUTOR.*",
        json.dumps({"argument": "Concrete adversarial replication objections."}),
    )
    vm.mock_llm(
        r".*You are the DEFENSE.*",
        json.dumps({"argument": "Evidence-based rebuttal for every claim."}),
    )
    vm.mock_llm(
        r".*You are the JUDGE.*",
        json.dumps(
            {
                "verdicts": [{"claim_id": "c1", "tier": tier, "credence": credence}],
                "attack_strength": attack,
                "rationale": "Mocked direct-mode ruling.",
            }
        ),
    )


def test_canonization_keeps_funded_post_challenge_reserve(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    contract.submit_study(
        "medicine",
        '[{"id":"c1","text":"Treatment improves the endpoint."}]',
        "response,value\nA,1\nB,2\nC,3\nD,4",
        "print('deterministic analysis')",
        "A sufficiently long publication abstract describing the claimed result.",
    )
    direct_vm.value = 0
    _mock_round(direct_vm, "REPLICATED", 800, 700)
    contract.evaluate_round(0)
    contract.evaluate_round(0)

    study = contract.get_study(0)
    assert int(study.status) == 1
    assert int(study.ever_canonized) == 1
    assert int(study.bond) == 3_000


def test_successful_post_canonization_challenge_has_real_bounty_source(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    contract.submit_study(
        "medicine",
        '[{"id":"c1","text":"Treatment improves the endpoint."}]',
        "response,value\nA,1\nB,2\nC,3\nD,4",
        "print('deterministic analysis')",
        "A sufficiently long publication abstract describing the claimed result.",
    )
    direct_vm.value = 0
    _mock_round(direct_vm, "REPLICATED", 800, 700)
    contract.evaluate_round(0)
    contract.evaluate_round(0)
    assert int(contract.get_study(0).bond) == 3_000

    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    contract.challenge(0)
    direct_vm.value = 0
    direct_vm.clear_mocks()
    _mock_round(direct_vm, "REFUTED", 0, 900)
    contract.evaluate_round(0)

    study = contract.get_study(0)
    assert int(study.status) == 2
    assert int(study.challenge_state) == 2
    assert int(study.bond) == 0
    assert int(contract.overturned_total) == 1


def test_failed_post_canonization_challenge_restores_status_and_keeps_reserve(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    contract.submit_study(
        "medicine",
        '[{"id":"c1","text":"Treatment improves the endpoint."}]',
        "response,value\nA,1\nB,2\nC,3\nD,4",
        "print('deterministic analysis')",
        "A sufficiently long publication abstract describing the claimed result.",
    )
    direct_vm.value = 0
    _mock_round(direct_vm, "REPLICATED", 800, 700)
    contract.evaluate_round(0)
    contract.evaluate_round(0)

    direct_vm.sender = direct_bob
    direct_vm.value = 1_000
    contract.challenge(0)
    direct_vm.value = 0
    assert int(contract.get_study(0).status) == 0

    direct_vm.clear_mocks()
    _mock_round(direct_vm, "REPLICATED", 750, 650)
    contract.evaluate_round(0)

    study = contract.get_study(0)
    assert int(study.status) == 1
    assert int(study.challenge_state) == 3
    assert int(study.bond) == 3_000
    assert int(contract.pool_balance) == 1_000
    assert contract.get_counts() == "1||1||0||1||0"


def test_low_credence_rounds_retract_and_move_bond_to_pool(
    direct_vm, direct_deploy, direct_alice
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 10_000
    contract.submit_study(
        "biology",
        '[{"id":"c1","text":"Marker predicts the endpoint."}]',
        "sample,value,replicate\nA,1,0\nB,1,0\nC,1,0\nD,1,0",
        "print('weak analysis')",
        "A sufficiently long publication abstract describing the claimed result.",
    )
    direct_vm.value = 0

    _mock_round(direct_vm, "REFUTED", 100, 850)
    contract.evaluate_round(0)
    contract.evaluate_round(0)

    study = contract.get_study(0)
    assert int(study.status) == 2
    assert int(study.bond) == 0
    assert contract.get_pool_balance() == "10000"
    assert contract.get_counts() == "1||0||1||0||0"


def test_challenge_and_settlement_invariants_across_status_counts_and_reserves(
    direct_vm, direct_deploy, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT)
    direct_vm.sender = direct_alice
    direct_vm.value = 20_000
    contract.submit_study(
        "physics",
        '[{"id":"c1","text":"The detector effect replicates."}]',
        "sample,value,replicate\nA,4,1\nB,4,1\nC,4,1\nD,4,1",
        "print('replication script')",
        "A sufficiently long publication abstract describing the claimed result.",
    )
    direct_vm.value = 0

    _mock_round(direct_vm, "REPLICATED", 850, 900)
    contract.evaluate_round(0)
    contract.evaluate_round(0)
    assert contract.get_counts() == "1||1||0||0||0"
    assert int(contract.get_study(0).bond) == 6_000

    direct_vm.sender = direct_bob
    direct_vm.value = 2_000
    contract.challenge(0)
    direct_vm.value = 0
    assert contract.get_counts() == "1||1||0||1||0"

    direct_vm.clear_mocks()
    _mock_round(direct_vm, "REFUTED", 50, 900)
    contract.evaluate_round(0)

    study = contract.get_study(0)
    # Successful challenge: reserve is consumed, bounty paid from the retained
    # bond source, remaining bond moves to the pool, and counts move once.
    assert int(study.status) == 2
    assert int(study.bond) == 0
    assert int(study.challenge_state) == 2
    assert contract.get_pool_balance() == "4200"
    assert contract.get_counts() == "1||1||1||1||1"
