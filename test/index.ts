import { ethers } from "hardhat";
import { expect } from "chai";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
    CCIPLocalSimulator,
    CCIPLocalSimulator__factory,
    CrossChainNameServiceRegister,
    CrossChainNameServiceRegister__factory,
    CrossChainNameServiceReceiver,
    CrossChainNameServiceReceiver__factory,
    CrossChainNameServiceLookup,
    CrossChainNameServiceLookup__factory,
} from "../typechain-types";

describe("CrossChainNameService", function () {
    let localSimulator: CCIPLocalSimulator;
    let crossChainNameServiceRegister: CrossChainNameServiceRegister;
    let crossChainNameServiceReceiver: CrossChainNameServiceReceiver;
    let crossChainNameServiceLookup: CrossChainNameServiceLookup;
    let deployer: SignerWithAddress;
    let alice: SignerWithAddress;
    let config: any;

    before(async () => {
        [deployer, alice] = await ethers.getSigners();
    });

    it("Should deploy CCIPLocalSimulator and fetch configuration", async function () {
        localSimulator = await new CCIPLocalSimulator__factory(
            deployer
        ).deploy();
        await localSimulator.deployed();

        config = await localSimulator.configuration();

        console.log("Configuration:", {
            chainSelector_: config.chainSelector_.toString(),
            sourceRouter_: config.sourceRouter_,
            destinationRouter_: config.destinationRouter_,
            wrappedNative_: config.wrappedNative_,
            linkToken_: config.linkToken_,
            ccipBnM_: config.ccipBnM_,
            ccipLnM_: config.ccipLnM_,
        });
    });

    it("Should deploy CrossChainNameService contracts", async function () {
        crossChainNameServiceLookup =
            await new CrossChainNameServiceLookup__factory(deployer).deploy();

        crossChainNameServiceRegister =
            await new CrossChainNameServiceRegister__factory(deployer).deploy(
                config.sourceRouter_,
                crossChainNameServiceLookup.address
            );

        crossChainNameServiceReceiver =
            await new CrossChainNameServiceReceiver__factory(deployer).deploy(
                config.sourceRouter_,
                crossChainNameServiceLookup.address,
                config.chainSelector_
            );
    });

    it("Should call enableChain and setCrossChainNameServiceAddress", async function () {
        await crossChainNameServiceRegister.enableChain(
            config.chainSelector_,
            crossChainNameServiceReceiver.address,
            1_000_000
        );

        await crossChainNameServiceLookup.setCrossChainNameServiceAddress(
            crossChainNameServiceRegister.address
        );
    });

    it("Should register and lookup a name", async function () {
        const name = "alice.ccns";
        const aliceAddress = alice.address;
        try {
            const tx = await crossChainNameServiceRegister
                .connect(alice)
                .register(name, { gasLimit: 1_000_000 });
        } catch (error) {
            console.error("Error during register:", error);
        }

        const resolvedAddress = await crossChainNameServiceLookup.lookup(name);

        expect(resolvedAddress).to.equal(aliceAddress);
    });
});
