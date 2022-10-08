const { assert, expect } = require("chai")
const { constants } = require("ethers")
const { getNamedAccounts, deployments, ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Tiditada Unit Tests", async function () {
          let tidiTada, tidiTadaContract, vrfCoordinatorV2Mock, tidiTadaFee, interval, player // deployer
          const chainId = network.config.chainId
          const EIGHTY_SIX = 86
          const ONE_HUNDRED = 100

          beforeEach(async () => {
              //   const { deployer } = await getNamedAccounts()
              //   //=================================
              //   accounts = await ethers.getSigners()
              //   player = accounts[1]
              //   //=================================
              //   await deployments.fixture(["all"])
              //   tidiTada = await ethers.getContract("Tiditada", deployer)
              //   vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
              //   //=================================
              //   tidiTadaFee = await tidiTada.getTidiTadaFee()
              //   interval = await tidiTada.getInterval()
              //   //=================================

              accounts = await ethers.getSigners()
              //deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["all"])
              //   tidiTada = await ethers.getContract("Tiditada", deployer)
              vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock" /*, deployer*/)
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
              //   ******************************************************************************
              it("does not allow entry when tidiTada is processing wins", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await tidiTada.performUpkeep([])
                  const tidiTadaState = await tidiTada.getTidiTadaState().toString()
                  //   await expect(tidiTada.enterTidiTada({ value: tidiTadaFee })).to.be.revertedWith(
                  //       "Tiditada__NotOpen"
                  //   )
                  await expect(tidiTadaState == "1").to.be.revertedWith("Tiditada__NotOpen")
              })
          })

          describe("checkUpkeep", async () => {
              it("returns false if no BUSD was sent", async () => {
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  //   const numPlayers = await tidiTada.getNumberOfPlayers()
                  const { upkeepNeeded } = await tidiTada.callStatic.checkUpkeep("0x")
                  //   assert.equal(numPlayers.toNumber() < 1, upkeepNeeded == false)
                  assert(!upkeepNeeded)
              })

              it("returns false if tidiTada does not have enough players", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const numPlayers = await tidiTada.getNumberOfPlayers()
                  const { upkeepNeeded } = await tidiTada.callStatic.checkUpkeep("0x")
                  assert.equal(numPlayers.toNumber() < 10, upkeepNeeded == false)
              })

              //   *******************************************************************************
              it("returns false if tidiTada isn't open", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  await tidiTada.performUpkeep([])
                  const tidiTadaState = await tidiTada.getTidiTadaState()
                  const { upkeepNeeded } = await tidiTada.callStatic.checkUpkeep("0x")
                  assert.equal(tidiTadaState.toString() == "1", upkeepNeeded == false)
              })

              it("returns false if interval hasn't passed", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() - 5])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const { upkeepNeeded } = await tidiTada.callStatic.checkUpkeep("0x")
                  assert(!upkeepNeeded)
              })

              it("returns true if interval has passed, has enough players, hasBalance and is open", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  const intervalPassed = await network.provider.send("evm_increaseTime", [
                      interval.toNumber() + 1,
                  ])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const numPlayers = await tidiTada.getNumberOfPlayers()
                  const tidiTadaState = await tidiTada.getTidiTadaState()
                  const hasBalance = await tidiTada.getContractBalance()
                  const { upkeepNeeded } = await tidiTada.callStatic.checkUpkeep("0x")
                  assert.equal(
                      numPlayers.toNumber() > 9 &&
                          tidiTadaState.toString() == "1" &&
                          intervalPassed &&
                          hasBalance > 0,
                      upkeepNeeded == true
                  )
              })
          })

          describe("performUpkeep", function () {
              it("can only run if checkUpkeep is true", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const tx = await tidiTada.performUpkeep("0x")
                  assert(tx)
              })

              it("reverts if checkUpkeep is false", async () => {
                  await expect(tidiTada.performUpkeep("0x")).to.be.revertedWith(
                      "Tiditada__UpkeepNotNeeded"
                  )
              })

              it("updates tidiTada state and emits a requestId", async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
                  const txResponse = await tidiTada.performUpkeep("0x") // emits requestId
                  const txReceipt = await txResponse.wait(1) // waits 1 block
                  const tidiTadaState = await tidiTada.getTidiTadaState() // updates state
                  const requestId = txReceipt.events[1].args.requestId
                  assert(requestId.toNumber() > 0)
                  assert(tidiTadaState == 1) // 0 = open, 1 = calculating
              })
          })

          describe("fulfillRandomWords", function () {
              beforeEach(async () => {
                  await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
                  await network.provider.request({ method: "evm_mine", params: [] })
              })
              it("can only be called after performupkeep", async () => {
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(0, tidiTada.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
                  await expect(
                      vrfCoordinatorV2Mock.fulfillRandomWords(1, tidiTada.address) // reverts if not fulfilled
                  ).to.be.revertedWith("nonexistent request")
              })

              // This test is too big...
              // This test simulates users entering the raffle and wraps the entire functionality of the raffle
              // inside a promise that will resolve if everything is successful.
              // An event listener for the WinnerPicked is set up
              // Mocks of chainlink keepers and vrf coordinator are used to kickoff this winnerPicked event
              // All the assertions are done once the WinnerPicked event is fired

              it("picks tidiTada winner, resets and sends winning amount", async () => {
                  const additionalEntrances = 10
                  const startingIndex = 2
                  for (let i = startingIndex; i < startingIndex + additionalEntrances; i++) {
                      tidiTada = tidiTadaContract.connect(accounts[i])
                      await tidiTada.enterTidiTada({ value: tidiTadaFee })
                  }

                  const startingTimeStamp = await tidiTada.getLastTimeStamp()

                  await new Promise(async (resolve, reject) => {
                      tidiTada.once("TidiTadaWinnerPicked", async () => {
                          console.log("TidiTadaWinnerPicked event fired!")

                          try {
                              const recentWinner = await tidiTada.getTidiTadaWinner()
                              const tidiTadaState = await tidiTada.getTidiTadaState()
                              const winnerBalance = await accounts[2].getBalance()
                              const endingTimeStamp = await tidiTada.getLastTimeStamp()
                              await expect(tidiTada.getPlayer(0)).to.be.reverted
                              //comparisons
                              assert.equal(
                                  recentWinner.toString(),
                                  "0x71bE63f3384f5fb98995898A86B02Fb2426c5788"
                              )
                              assert.equal(tidiTadaState, 0)
                              assert
                                  .equal(
                                      (winnerBalance.mul(EIGHTY_SIX) / ONE_HUNDRED).toString(),
                                      startingBalance // startingBalance + ( (tidiTadaFee * additionalEntrances) + tidiTadaFee )
                                          .add(
                                              tidiTadaFee.mul(additionalEntrances).add(tidiTadaFee)
                                          )
                                          .mul(EIGHTY_SIX) / ONE_HUNDRED
                                  )
                                  .toString()
                              //   assert.equal()
                              assert(endingTimeStamp > startingTimeStamp)
                              resolve()
                          } catch (error) {
                              reject(error)
                          }
                      })

                      const tx = await tidiTada.performUpkeep("0x")
                      const txReceipt = await tx.wait(1)
                      const startingBalance = await accounts[2].getBalance()
                      await vrfCoordinatorV2Mock.fulfillRandomWords(
                          txReceipt.events[1].args.requestId,
                          tidiTada.address
                      )
                  })
              })
          })
      })
