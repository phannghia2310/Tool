const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { chromium } = require("playwright");
const { DateTime } = require("luxon");

class TapSwap {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "Content-Type": "application/json",
      Origin: "https://app.tapswap.club",
      Referer: "https://app.tapswap.club/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "X-App": "tapswap_server",
      "X-Cv": "662",
      "X-Touch": "1",
    };
    this.playerData = {};
    this.b_name = {
      b_01: "TapFlix",
      b_02: "Monument to Toncoin",
      b_03: "Factory",
      b_04: "Tapping Guru",
      b_05: "To the moon!",
      b_06: "Trampoline",
      b_07: "Bit Club",
      b_08: "Karaoke",
      b_09: "Point of view",
      b_10: "Prosecco fountain",
      b_11: "Biker club",
      b_12: "Istukan",
      b_13: "Salmon",
      b_14: "Telegram duck",
      b_15: "Brewery",
      b_16: "Webrave",
      b_17: "Gold button",
      b_18: "Casino",
      b_19: "Cooking hub",
      b_20: "Tap stadium",
    };
  }

  setCacheId(cacheId) {
    this.headers["Cache-Id"] = cacheId;
  }

  delCacheId() {
    delete this.headers["Cache-Id"];
  }

  setAuthorization(token) {
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  delAuthorization() {
    delete this.headers["Authorization"];
  }

  log(msg, type = "info") {
    const timestamp = new Date().toLocaleTimeString();
    switch (type) {
      case "success":
        console.log(`[${timestamp}] [*] ${msg}`.green);
        break;
      case "custom":
        console.log(`[${timestamp}] [*] ${msg}`.magenta);
        break;
      case "error":
        console.log(`[${timestamp}] [!] ${msg}`.red);
        break;
      case "warning":
        console.log(`[${timestamp}] [*] ${msg}`.yellow);
        break;
      default:
        console.log(`[${timestamp}] [*] ${msg}`.blue);
    }
  }

  async countdown(t) {
    while (t) {
      const hours = String(Math.floor(t / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((t % 3600) / 60)).padStart(2, "0");
      const seconds = String(t % 60).padStart(2, "0");
      process.stdout.write(
        `[*] Chờ ${hours}:${minutes}:${seconds}     \r`.gray
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
      t -= 1;
    }
    process.stdout.write("\r");
  }

  async extractChq(chq) {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 375, height: 812 },
      userAgent: this.headers["User-Agent"],
    });

    const page = await context.newPage();

    await page.evaluate(() => {
      window.ctx = {};
      window.ctx.api = {};
      window.ctx.d_headers = new Map();
      window.ctx.api.setHeaders = function (entries) {
        for (const [key, value] of Object.entries(entries)) {
          window.ctx.d_headers.set(key, value);
        }
      };
      const chrStub = document.createElement("div");
      chrStub.id = "_chr_";
      document.body.appendChild(chrStub);
    });

    const bytesArray = new Uint8Array(chq.length / 2);
    const xorKey = 157;

    for (let i = 0; i < chq.length; i += 2) {
      bytesArray[i / 2] = parseInt(chq.substr(i, 2), 16);
    }

    const xorBytes = bytesArray.map((byte) => byte ^ xorKey);
    const decodedChq = new TextDecoder().decode(xorBytes);

    const chrKey =
      912 + (await page.evaluate((code) => eval(code), decodedChq));

    const cacheId = await page.evaluate(() =>
      window.ctx.d_headers.get("Cache-Id")
    );

    await browser.close();

    return { chrKey, cacheId };
  }

  async login(initData) {
    const url = "https://api.tapswap.club/api/account/login";
    const payload = {
      init_data: initData,
      referrer: "",
      bot_key: "app_bot_0",
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });

      if (response.status === 201) {
        const chq = response.data.chq;

        if (chq) {
          const { chrKey, cacheId } = await this.extractChq(chq);

          this.setCacheId(cacheId);
          const challengeUrl = "https://api.tapswap.club/api/account/challenge";
          const challengePayload = { ...payload, chr: chrKey };

          try {
            const challengeResponse = await axios.post(
              challengeUrl,
              challengePayload,
              { headers: this.headers }
            );
            if (challengeResponse.status === 201) {
              const challengeData = challengeResponse.data;
              const token = challengeData.access_token;
              this.setAuthorization(token);
              this.playerData = challengeData;
              this.log("Đăng nhập thành công", "success");
            } else {
              this.log("Đăng nhập thất bại", "error");
            }
          } catch (err) {
            this.log(err.message, "error");
          }
        }
      }
    } catch (err) {
      this.log(err.message, "error");
    }
  }

  async joinMission(missionId) {
    const url = "https://api.tapswap.club/api/missions/join_mission";
    const payload = { id: missionId };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status === 201) {
        this.log("Tham gia nhiệm vụ thành công", "success");
      } else {
        this.log("Tham gia nhiệm vụ thất bại", "error");
      }
    } catch (err) {
      if (err.response.data.message == "mission_already_joined") {
        this.log("Nhiệm vụ đã tham gia trước đó", "warning");
      } else {
        this.log(err.message, "error");
      }
    }
  }

  async finishMissionItem(payload) {
    const url = "https://api.tapswap.club/api/missions/finish_mission_item";

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status === 201) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      this.log(err.response.data && err.response.data.message, "error");
      return false;
    }
  }

  async finishMission(missionId) {
    const url = "https://api.tapswap.club/api/missions/finish_mission";
    const payload = { id: missionId };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status === 201) {
        return true;
      } else {
        return false;
      }
    } catch (err) {
      console.log(err);
      return false;
    }
  }

  async claimTask(task_id) {
    const url = "https://api.tapswap.club/api/player/claim_reward";
    const payload = { task_id: task_id };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status === 201) {
        this.log("Nhận thưởng nhiệm vụ thành công", "success");
      } else {
        this.log("Nhận thưởng nhiệm vụ thất bại", "error");
      }
    } catch (err) {
      this.log(err.response.data && err.response.data.message, "error");
    }
  }

  async manageTask(playerData) {
    const allTasks = playerData.conf.missions.reverse();
    let cinemaCount = playerData.account.missions.cinema_cnt;
    const completedTasks = playerData.account.missions.completed;
    const answers = require("./answer.json");

    for (const task of allTasks) {
      if (completedTasks.includes(task.id)) {
        continue;
      }

      this.log(`Bắt đầu nhiệm vụ: ${task.title}...`, "custom");
      await this.joinMission(task.id);
      await this.countdown(3);

      let skipTask = false;
      for (let i = 0; i < task.items.length; i++) {
        const item = task.items[i];
        this.log(
          `Thực hiện item ${i + 1}/${task.items.length}: ${item.name}`,
          "custom"
        );

        let payload = { id: task.id, itemIndex: i };

        if (item.wait_duration_s) {
          await this.countdown(item.wait_duration_s);
        }

        if (item.require_answer) {
          this.log(
            `Item ${item.name} yêu cầu trả lời, tìm code từ answer.json...`,
            "warning"
          );

          const answer = answers.find(
            (ans) => ans.title.toLowerCase() === task.title.toLowerCase()
          );
          if (answer && Array.isArray(answer.codes)) {
            let validCodeFound = false;
            for (const code of answer.codes) {
              payload = { ...payload, user_input: code };
              const success = await this.finishMissionItem(payload);
              if (success) {
                validCodeFound = true;
                this.log(`Code hợp lệ: ${code}`, "success");
                break;
            } else {
                this.log(`Code không hợp lệ: ${code}`, "warning");
            }
            }

            if (!validCodeFound) {
              this.log(
                `Không tìm thấy code hợp lệ cho item ${item.name}, chuyển sang nhiệm vụ tiếp theo...`,
                "error"
              );
              skipTask = true;
              break;
            }
          } else {
            this.log(
              `Không tìm thấy danh sách code cho item ${item.name}, chuyển sang nhiệm vụ tiếp theo...`,
              "error"
            );
            skipTask = true;
            break;
          }
        } else {
          await this.finishMissionItem(payload);
        }
        await this.countdown(3);
      }

      if (skipTask) {
        continue;
      }

      const finish = await this.finishMission(task.id);
      if (finish) {
        this.log(`Hoàn thành nhiệm vụ ${task.title}`, "success");
        await this.countdown(3);
        await this.claimTask(task.id);
        cinemaCount += 1;
      } else {
        this.log(`Nhiệm vụ ${task.title} thất bại`, "error");
      }

      if (cinemaCount === 10) {
        this.log("Cinema count đạt 10, claim task CINEMA...", "custom");
        await this.claimTask("CINEMA");
        cinemaCount = 0;
      }
    }
  }

  async submitTaps(taps) {
    const url = "https://api.tapswap.club/api/player/submit_taps";
    const payload = {
      taps: taps,
      time: Date.now(),
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.player;
    } catch (error) {
      this.log(`Lỗi tap: ${error.message}`, "error");
      return null;
    }
  }

  async applyBoost(type) {
    const url = "https://api.tapswap.club/api/player/apply_boost";
    const payload = { type };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.player;
    } catch (error) {
      this.log(`Lỗi boost: ${error.message}`, "error");
      return null;
    }
  }

  async upgradeBuild(b_id) {
    const url = "https://api.tapswap.club/api/town/upgrade_building";
    const payload = {
      building_id: b_id,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return error.response.data.message;
    }
  }

  buildNewLevel(b_id, playerData) {
    const i = parseInt(b_id.replace("b_", "")) - 1;
    const levels = playerData.conf.town.buildings[i].levels[2];

    if (!levels) return null;

    const data = { ...levels.cost };
    data.rate = Math.floor(levels.rate * 3600);
    const req = levels.required;
    if (req) {
      data.r_id = req.id;
      data.r_level = req.level;
    } else {
      data.r_id = null;
      data.r_level = null;
    }

    return data;
  }

  buildCurrentLevel(b_id, playerData) {
    const building = playerData.player.town.buildings.find(
      (build) => build.id == b_id
    );
    if (building) {
      return building.ready_at > Date.now()
        ? building.level - 1
        : building.level;
    }
    return 0;
  }

  async buildersFree(playerData) {
    let awaitTime = 0;
    const playerTime = playerData.player.time;
    const buildsStat = playerData.player.town.buildings;
    let countBuilders = 0;

    for (const build of buildsStat) {
      const timeAt = build.ready_at - playerTime;
      if (timeAt > 0) {
        countBuilders++;
        if (awaitTime === 0 || awaitTime > timeAt) {
          awaitTime = timeAt;
        }
      }
    }

    if (countBuilders >= playerData.player.town.builders) {
      this.log("Tất cả builders đều đang bận...", "info");
      return Math.floor(awaitTime / 1000);
    }

    this.log("Không có builder miễn phí nào!", "warning");
    return 0;
  }

  async buildTown(playerData) {
    const b_crystals = playerData.player.crystals;
    const b_blocks = playerData.player.blocks;
    const b_videos = playerData.player.videos;
    const b_reward = playerData.player.stat.reward;

    const upgradeList = {};

    for (const [id, name] of Object.entries(this.b_name)) {
      const cost = this.buildNewLevel(id, playerData);

      if (!cost) continue;

      const curLvl = this.buildCurrentLevel(id, playerData);

      let isConstruct = false;
      for (const data of playerData.player.town.buildings) {
        if (data.id === id && data.ready_at / 1000 > Date.now()) {
          isConstruct = true;
          break;
        }
      }

      if (isConstruct) continue;

      if (curLvl >= 20) continue;

      let rName = null;
      let rLvl = null;

      if (
        cost.shares <= b_reward &&
        cost.blocks <= b_blocks &&
        cost.videos <= b_videos
      ) {
        if (cost.r_id) {
          rName = this.b_name[cost.r_id];
          rLvl = cost.r_level;
          if (rLvl <= this.buildCurrentLevel(cost.r_id, playerData)) {
            upgradeList[id] = [curLvl, cost.rate];
          }
        } else {
          upgradeList[id] = [curLvl, cost.rate];
        }
      }
    }

    while (true) {
      const awaitTime = await this.buildersFree(playerData);
      if (awaitTime > 0) {
        this.log(`Chờ thời gian xây dựng ${awaitTime} giây`, "warning");
        return false;
      }

      let idBest = "";
      let lvlMin = 100;

      if (Object.keys(upgradeList).length === 0) {
        return false;
      }

      for (const [id, res] of Object.entries(upgradeList)) {
        if (lvlMin > res[0]) {
          idBest = id;
          lvlMin = res[0];
        }
      }

      if (!idBest) break;

      this.log(
        `Bắt đầu nâng cấp ${this.b_name[idBest]} lên cấp ${lvlMin + 1}`,
        "custom"
      );

      const status = await this.upgradeBuild(idBest);
      if (status.player) {
        playerData = { ...playerData, ...status };
        delete upgradeList[idBest];
        this.log(`${this.b_name[idBest]} nâng cấp thành công`, "success");
        await this.countdown(5);
        return true;
      } else if (status === "building_already_upgrading") {
        this.log("Tòa nhà đang được nâng cấp. Đang chờ...", "warning");
        await this.countdown(5);
        return true;
      } else if (status === "no_available_builders") {
        this.log(`Không có builders có sẵn. Đang chờ xây dựng.`, "warning");
        await this.countdown(5);
        return false;
      } else if (status === "required_building_level_too_low") {
        this.log(
          `Yêu cầu về mức độ xây dựng quá thấp. Đang chờ thi công.`,
          "warning"
        );
        await this.countdown(5);
        return false;
      } else if (status === "not_enough_videos") {
        this.log(`Không đủ tài nguyên Video. Đang chờ thi công.`, "warning");
        await this.countdown(5);
        return false;
      } else if (status === "not_enough_shares") {
        this.log(`Không đủ tiền tài nguyên. Đang chờ thi công.`, "warning");
        await this.countdown(5);
        return false;
      } else if (status === "Unauthorized") {
        this.log(`Unauthorized. Construction is stop.`, "error");
        await this.countdown(5);
        return false;
      } else if (status === "tg_channel_check_failed") {
        this.log(
          `Kiểm tra kênh TG không thành công. Đang chờ thi công.`,
          "warning"
        );
        await this.countdown(5);
        return false;
      } else {
        this.log(`Lỗi nâng cấp: ${status}`, "error");
        await this.countdown(5);
        break;
      }
    }

    return false;
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userName = userData.username;
        const userId = userData.id;

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        await this.login(initData);

        if (this.playerData) {
          const player = this.playerData.player;
          this.log(`Tài khoản: ${player.name}`, "green");
          this.log(`Taps: ${player.shares}`, "green");
          this.log(`Blocks: ${player.blocks}`, "green");
          this.log(`Crystals: ${player.crystals}`, "green");
          this.log(`Video: ${player.videos}`, "green");
          this.log(`Energy: ${player.energy}`, "green");

          let energy = player.energy;
          let level = player.energy_level;
          let taps = Math.floor(energy / level);

          while (true) {
            this.headers["Content-Id"] = parseInt(
              (((Date.now() * userId * userId) / userId) % userId) % userId
            );

            if (energy < level) {
              let hasBoost = false;
              const boosts = player.boost;

              for (const boost of boosts) {
                if (boost.cnt > 0) {
                  hasBoost = true;
                  this.log(`Bắt đầu thực hiện boost: ${boost.type}`, "custom");

                  let result = await this.applyBoost(boost.type);
                  if (result) {
                    this.log(`Boost ${boost.type} thành công`, "success");

                    // Cập nhật thông tin người chơi sau khi boost thành công
                    energy = result.energy;
                    level = result.energy_level;

                    if (boost.type == "energy") {
                      taps = Math.floor(energy / level);
                    } else {
                      taps = Math.floor(level * 5 + 2500);
                    }

                    await this.countdown(3);

                    // Thực hiện tap lại sau boost
                    const newPlayer = await this.submitTaps(taps);
                    if (newPlayer) {
                      this.log(`Thực hiện tap thành công`, "success");
                      energy = newPlayer.energy;
                      level = newPlayer.energy_level;
                    }

                    // Giảm số lần boost chỉ khi thành công
                    boost.cnt--;
                    break;
                  } else {
                    this.log(`Boost ${boost.type} thất bại`, "error");
                  }
                }
              }

              if (!hasBoost) {
                this.log(`Không còn boost khả dụng, dừng vòng lặp`, "info");
                break;
              }
            } else {
              const newPlayer = await this.submitTaps(taps);
              if (newPlayer) {
                this.log(`Thực hiện tap thành công`, "success");
                energy = newPlayer.energy;
                level = newPlayer.energy_level;
              }
            }
            await this.countdown(5);
          }

          await this.buildTown(this.playerData);
          await this.manageTask(this.playerData);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(30 * 60);
    }
  }
}

if (require.main === module) {
  const tapswap = new TapSwap();
  tapswap.main().catch((err) => {
    console.error(err.toString().red);
    process.exit(1);
  });
}
