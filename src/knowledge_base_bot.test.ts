import { strict as assert } from "node:assert";
import { chooseHandoff } from "./knowledge_base_bot.js";

assert.equal(chooseHandoff([{ metadata: { kind: "seller" } }]), "seller-success");
assert.equal(chooseHandoff([{ metadata: { kind: "buyer" } }]), "buyer-care");
console.log("handoff decision test passed");
