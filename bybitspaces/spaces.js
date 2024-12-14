const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");

class BybitSpaces {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      Origin: "https://www.bybit.com",
      Referer: "https://www.bybit.com/",
      "Sec-Ch-Ua":
        '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge WebView2";v="131"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    };
    this.game_key = null;
    this.speed = null;
    this.time = null;
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

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  convertToUnix(timeStamp) {
    const dtObj = new Date(timeStamp);
    return Math.floor(dtObj.getTime() / 1000);
  }

  convertToHmac(t = {}, e = "") {
    const sortedKeys = Object.keys(t).sort();
    const queryString = sortedKeys.map((key) => `${key}=${t[key]}`).join("&");
    return crypto.createHmac("sha256", e).update(queryString).digest("hex");
  }

  generatePayload(startTime) {
    const time = this.getRandomInt(40, 60);
    const gift = this.getRandomInt(0, 3) * 50;
    const points = time * 2 + gift;
    const endTime = parseInt(startTime, 10) + time * 1000;
    const payload = this.convertToHmac(
      { start_time: startTime, end_time: endTime, point: points },
      this.game_key
    );

    return [payload, startTime, endTime, points];
  }

  async registerOrLogin(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/registerOrLogin";
    const payload = {
      inviterCode: "7R198856",
    };
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, payload, { headers: headers });
      return response.data;
    } catch (error) {
      this.log(`Lỗi đăng nhập: ${error.message}`, "error");
      return null;
    }
  }

  async getFarmStatus(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/user/farm/status";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, {}, { headers: headers });
      if (response.data.retCode == 0) {
        return response.data.result;
      }
    } catch (error) {
      this.log(`Lỗi lấy thông tin farm: ${error.message}`, "error");
    }
  }

  async startFarm(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/user/farm/start";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, {}, { headers: headers });
      if (response.data.retCode == 0) {
        this.log(`Bắt đầu farm thành công!`, "success");
      } else {
        this.log("Bắt đầu farm thất bại!", "error");
      }
    } catch (error) {
      this.log(`Lỗi khi bắt đầu farm: ${error.message}`, "error");
    }
  }

  async claimFarm(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/user/farm/claim";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, {}, { headers: headers });
      if (response.data.retCode == 0) {
        this.log(
          `Claim farm thành công ${Math.round(this.speed * this.time)} point!`,
          "success"
        );
      } else {
        this.log("Claim farm thất bại!", "error");
      }
    } catch (error) {
      this.log(`Lỗi khi claim farm: ${error.message}`, "error");
    }
  }

  async manageFarm(initData) {
    const farmStatus = await this.getFarmStatus(initData);
    this.speed = parseFloat(farmStatus.pointPerMinute);
    this.time = parseInt(farmStatus.resetMinutes);
    if (farmStatus.status == "FarmStatus_Running") {
      this.log(`Bạn đã thực hiện farm, chờ ${this.time} phút`, "warning");
    } else if (farmStatus.status == "FarmStatus_Wait_Claim") {
      await this.claimFarm(initData);
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await this.startFarm(initData);
    } else {
      await this.startFarm(initData);
    }
  }

  async getAdsTask(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/ads/list";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.get(url, { headers: headers });
      if (response.data.retCode == 0) {
        return response.data.result.adsList;
      }

      return null;
    } catch (error) {
      this.log(`Lỗi khi lấy nhiệm vụ Ads: ${error.message}`, "error");
      return null;
    }
  }

  async getGeneralTask(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/v2/task/list";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.get(url, { headers: headers });
      if (response.data.retCode == 0) {
        return response.data.result;
      }

      return null;
    } catch (error) {
      this.log(`Lỗi khi lấy nhiệm vụ: ${error.message}`, "error");
      return null;
    }
  }

  async completeTask(initData, taskId) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/task/complete";
    const payload = {
      tgVoucher: "todamoon",
      taskId: taskId,
    };
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, payload, { headers: headers });
      if (response.data.retCode == 0) {
        return true;
      }
      return false;
    } catch (error) {
      this.log(`Lỗi khi hoàn thành nhiệm vụ: ${error.message}`, "error");
      return false;
    }
  }

  async manageTask(initData) {
    const adsTask = await this.getAdsTask(initData);
    const generalTask = await this.getGeneralTask(initData);
    const tasks = [
      ...generalTask.tasks,
      ...adsTask,
      ...generalTask.exploreTasks,
    ];

    for (let task of tasks) {
      if (task.status == 2) {
        continue;
      } else {
        this.log(`Bắt đầu thực hiện nhiệm vụ ${task.taskName}...`);
        const complete = await this.completeTask(initData, task.taskId);
        if (complete) {
          this.log(`Đã hoàn thành nhiệm vụ ${task.taskName}`, "success");
        } else {
          this.log(
            `Không thể hoàn thành nhiệm vụ ${task.taskName} | Cần tự làm`,
            "error"
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  async getGameStatus(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/user/game/status";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, {}, { headers: headers });
      return response.data.result;
    } catch (error) {
      this.log(`Lỗi lấy thông tin game: ${error.message}`, "error");
      return null;
    }
  }

  async startGame(initData) {
    const url = "https://api2.bybit.com/web3/api/web3game/tg/user/game/start";
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, {}, { headers: headers });
      if (response.data.retCode == 0) {
        return response.data.result;
      }
    } catch (error) {
      this.log(`Lỗi bắt đầu game: ${error.message}`, "error");
      return null;
    }
  }

  async postScore(initData, start_time, sign, points, end_time) {
    const url =
      "https://api2.bybit.com/web3/api/web3game/tg/user/game/postScore";
    const payload = {
      start_time: start_time,
      end_time: end_time,
      point: points,
      sign: sign,
    };
    const headers = {
      ...this.headers,
      Authorization: initData,
    };

    try {
      const response = await axios.post(url, payload, { headers: headers });
      if (response.data.retCode == 0) {
        this.log(`Hoàn thành trò chơi, kiếm được: ${points}`, "success");
        return true;
      } else {
        this.log("Không thể hoàn thành trò chơi!", "error");
      }
    } catch (error) {
      this.log(`Lỗi khi hoàn thành game: ${error.message}`, "error");
    }
  }

  async manageGame(initData) {
    const gameStatus = await this.getGameStatus(initData);

    if (gameStatus.totalCount == gameStatus.usedCount) {
      this.log("Đã hết vé chơi game!", "warning");
    } else {
      let totalTickets = gameStatus.totalCount - gameStatus.usedCount;
      this.log(`Số vé chơi game còn lại: ${totalTickets}`, "custom");
      while (totalTickets > 0) {
        this.log(`Bắt đầu chơi game...`);
        const start = await this.startGame(initData);
        const payload = this.generatePayload(start.time);
        const gameCountdown = (payload[2] - parseInt(payload[1])) / 1000;

        await this.countdown(gameCountdown);
        await this.postScore(
          initData,
          payload[1],
          payload[0],
          payload[3],
          payload[2]
        );
        totalTickets--;
      }
    }
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

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        const loginResult = await this.registerOrLogin(initData);
        if (loginResult) {
          this.game_key = loginResult.result.signKey;
          this.log(`Balance: ${loginResult.result.point}`, "success");

          await this.manageFarm(initData);
          await this.manageTask(initData);
          await this.manageGame(initData);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(24 * 60 * 60);
    }
  }
}

const client = new BybitSpaces();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
