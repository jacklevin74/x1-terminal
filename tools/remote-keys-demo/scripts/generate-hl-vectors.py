"""Independent reference vectors. Optional deps: msgpack, eth-account.
Matches action_hash/l1_payload in Hyperliquid's official Python SDK signing.py.
Uses synthetic public actions only; no wallets or credentials.
"""
import json
from pathlib import Path
import msgpack
from eth_utils import keccak
from eth_account.messages import encode_typed_data

action = {"type": "cancel", "cancels": [{"a": 25, "o": 12345}]}
nonce = 1700000000000
vectors = []
for source in ["a", "b"]:
    for vault in [None, "0x1111111111111111111111111111111111111111"]:
        for expiry in [None, nonce + 60000]:
            data = msgpack.packb(action) + nonce.to_bytes(8, "big")
            data += b"\x00" if vault is None else b"\x01" + bytes.fromhex(vault[2:])
            if expiry is not None:
                data += b"\x00" + expiry.to_bytes(8, "big")
            connection_id = keccak(data)
            message = encode_typed_data(
                domain_data={"name": "Exchange", "version": "1", "chainId": 1337,
                             "verifyingContract": "0x0000000000000000000000000000000000000000"},
                message_types={"Agent": [{"name": "source", "type": "string"},
                                          {"name": "connectionId", "type": "bytes32"}]},
                message_data={"source": source, "connectionId": connection_id})
            digest = keccak(b"\x19" + message.version + message.header + message.body)
            options = {"source": source, "vaultAddress": vault, "nonce": nonce}
            if expiry is not None:
                options["expiresAfter"] = expiry
            vectors.append({"action": action, "options": options, "digest": "0x" + digest.hex()})
Path(__file__).resolve().parents[1].joinpath("test/fixtures/hl-digests.json").write_text(
    json.dumps(vectors, indent=2) + "\n")
