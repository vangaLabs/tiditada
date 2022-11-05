const { assert, expect } = require("chai")
const { constants } = require("ethers")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Tiditada Unit Tests", async function () {
          let tidiTada, tidiTadaContract, vrfCoordinatorV2Mock, tidiTadaFee, interval, player
          const chainId = network.config.chainId
          const EIGHTY_FIVE = 85
          const ONE_HUNDRED = 100

          beforeEach(async () => {
              accounts = await ethers.getSigners()

              player = accounts[1]
              await deployments.fixture(["all"])

              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock")
              tidiTadaContract = await ethers.getContract("Tiditada")
              tidiTada = tidiTadaContract.connect(player)
              tidiTadaFee = await tidiTada.getTidiTadaFee()
              interval = await tidiTada.getInterval()
          })

          describe("constructor", async () => {
              it("initialized the Tiditada Raffle correctly", async () => {
                  const tidiTadaState = await tidiTada.getTidiTadaState()
                  const interval = await tidiTada.getInterval()
                  assert.equal(tidiTadaState.toString(), "0")
                  assert.equal(interval.toString(), networkConfig[chainId]["interval"])
              })
          })

          describe("enterTidiTada", async () => {
              it("reverts when you do not pay enough", async () => {
                  await expect(tidiTada.enterTidiTada()).to.be.revertedWith(
                      "Tiditada__InsufficientEntranceFee"
                  )
              })

              it("records player when they enter", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  const contractPlayer = await tidiTada.getPlayer(0)
                  assert.equal(player.address, contractPlayer)
              })

              it("emits event on enter", async () => {
                  await expect(tidiTada.enterTidiTada({ value: tidiTadaFee })).to.emit(
                      tidiTada,
                      "TidiTadaEntered"
                  )
              })
          })
      })
