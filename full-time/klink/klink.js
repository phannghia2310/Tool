const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { chromium } = require("playwright");
const { DateTime } = require("luxon");
const crypto = require("crypto");
const querystring = require("querystring");

class Klink {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "Content-Type": "application/json",
      Origin: "https://bot.klink.finance",
      Referer: "https://bot.klink.finance/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    };
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

  loadData(file) {
    const datas = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "");
    if (datas.length <= 0) {
      console.log(colors.red(`Không tìm thấy dữ liệu`));
      process.exit();
    }
    return datas;
  }

  save(id, token) {
    const tokens = JSON.parse(fs.readFileSync("token.json", "utf8"));
    tokens[id] = token;
    fs.writeFileSync("token.json", JSON.stringify(tokens, null, 4));
  }

  get(id) {
    const tokens = JSON.parse(fs.readFileSync("token.json", "utf8"));
    return tokens[id] || null;
  }

  isExpired(token) {
    const [header, payload, sign] = token.split(".");
    const decodedPayload = Buffer.from(payload, "base64").toString();

    try {
      const parsedPayload = JSON.parse(decodedPayload);
      const now = Math.floor(DateTime.now().toSeconds());

      if (parsedPayload.exp) {
        const expirationDate = DateTime.fromSeconds(
          parsedPayload.exp
        ).toLocal();
        this.log(
          colors.cyan(
            `Token hết hạn vào: ${expirationDate.toFormat(
              "yyyy-MM-dd HH:mm:ss"
            )}`
          )
        );

        const isExpired = now > parsedPayload.exp;
        this.log(
          colors.cyan(
            `Token đã hết hạn chưa? ${
              isExpired ? "Đúng rồi bạn cần thay token" : "Chưa..chạy tẹt ga đi"
            }`
          )
        );

        return isExpired;
      } else {
        this.log(
          colors.yellow(`Token vĩnh cửu không đọc được thời gian hết hạn`)
        );
        return false;
      }
    } catch (error) {
      this.log(colors.red(`Lỗi rồi: ${error.message}`));
      return true;
    }
  }

  async getOrRefreshToken(id, data) {
    let token = this.get(id);
    if (token) {
      const expired = this.isExpired(token);
      if (!expired) {
        return token;
      }
    }

    this.log(
      colors.yellow(
        `Token không được tìm thấy hoặc đã hết hạn ${id}. đăng nhập...`
      )
    );
    try {
      token = await this.login(data);
      if (token) {
        this.save(id, token);
        this.log(colors.green(`Đã lấy token cho tài khoản ${id}`));
        this.isExpired(token);
      } else {
        this.log(colors.red(`Không lấy được token cho tài khoản ${id}`));
      }
    } catch (error) {
      this.log(colors.red(`Đăng nhập thất bại ${id}: ${error.message}`));
      return null;
    }
    return token;
  }

  generateRandomHexString(length) {
    const randomValues = crypto.getRandomValues(new Uint8Array(length));
    return Array.from(randomValues, (value) =>
      value.toString(16).padStart(2, "0")
    )
      .join("")
      .slice(0, length);
  }

  async generateSessionKey() {
    let currentTime = Math.floor(Date.now());
    const hexPrefix = "0x" + this.generateRandomHexString(3);
    const randomString1 = this.generateRandomHexString(5);
    const randomString2 = this.generateRandomHexString(5);
    const randomString3 = this.generateRandomHexString(5);
    const randomString4 = this.generateRandomHexString(12);

    currentTime += 4234;

    const combinedString = ""
      .concat(hexPrefix)
      .concat(randomString2)
      .concat(currentTime)
      .concat(randomString3)
      .concat(randomString1)
      .concat(randomString4);

    const encoded = new TextEncoder().encode(combinedString);

    return btoa(String.fromCharCode(...encoded));
  }

  async login(initData) {
    const userData = JSON.parse(
      decodeURIComponent(initData.split("user=")[1].split("&")[0])
    );
    const userId = userData.id;
    const firstName = userData.first_name;
    const lastName = userData.last_name;
    const userName = userData.username;
    const languageCode = userData.language_code;
    const allowsWriteToPm = userData.allows_write_to_pm;
    const photoUrl = userData.photo_url;

    const url = `https://klink-bot.klink.finance/api/v1/user/${userId}?isAuth=true&initailData[id]=${userId}&initailData[first_name]=${firstName}&initailData[last_name]=${lastName}&initailData[username]=${userName}&initailData[language_code]=${languageCode}&initailData[allows_write_to_pm]=${allowsWriteToPm}&initailData[photo_url]=${photoUrl}`;

    try {
      const response = await axios.get(url, {
        headers: this.headers,
      });

      if (response.status === 200) {
        return response.data.data.token;
      }
    } catch (error) {
      return null;
    }
  }

  async userInfo(userId) {
    const url = `https://klink-bot.klink.finance/api/v1/mining/userInfo/${userId}`;
    const sessionKey = await this.generateSessionKey();
    try {
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          Sessionkey: sessionKey,
        },
      });

      if (response.status === 200) {
        return response.data.data.user;
      }
    } catch (error) {
      return null;
    }
  }

  async dailyClaim(userId) {
    const url = `https://klink-bot.klink.finance/api/v1/dailyCheckIn/claim-reward/${userId}`;
    const sessionKey = await this.generateSessionKey();

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            ...this.headers,
            Sessionkey: sessionKey,
          },
        }
      );

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      return null;
    }
  }

  async sendTap(userId) {
    const url = `https://klink-bot.klink.finance/api/v1/user/${userId}/add-point`;
    const sessionKey = await this.generateSessionKey();
    const payload = {
      points: 500,
      totalTaps: 499,
      currentEnergy: 1,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
          Sessionkey: sessionKey,
        },
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async startMining(userId) {
    const url = `https://klink-bot.klink.finance/api/v1/mining/startMining/${userId}`;
    const sessionKey = await this.generateSessionKey();

    try {
      const response = await axios.post(
        url,
        {},
        {
          headers: {
            ...this.headers,
            Sessionkey: sessionKey,
          },
        }
      );

      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getAllTasks(userId) {
    const url = `https://klink-bot.klink.finance/api/v1/task/getUserTasks/${userId}`;
    const sessionKey = await this.generateSessionKey();

    try {
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          Sessionkey: sessionKey,
        },
      });

      if (response.status === 200) {
        return response.data.data;
      }
    } catch (error) {
      return null;
    }
  }

  async excuteTask(userId, taskId) {
    const url = `https://klink-bot.klink.finance/api/v1/task/execute/${userId}`;
    const sessionKey = await this.generateSessionKey();
    const payload = {
      taskId: taskId,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
          Sessionkey: sessionKey,
        },
      });

      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      return null;
    }
  }

  async manageTask(userId) {
    const tasks = await this.getAllTasks(userId);

    if (tasks) {
      for (const task of tasks) {
        if (task.completed) {
          continue;
        } else {
          this.log(colors.cyan(`Bắt đầu thực hiệm task ${task.taskName}...`));
          const result = await this.excuteTask(userId, task.id);
          if (result.success) {
            this.log(colors.green(`Task ${task.taskName} hoàn thành`));
          } else {
            this.log(colors.red(`Task ${task.taskName} thất bại`));
          }
        }
      }
    } else {
      this.log(colors.yellow(`Không tìm thấy task khả dụng`));
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
        const userId = userData.id;

        console.log(`========== Tài khoản ${i + 1} | ${userId} ==========`);

        const token = await this.getOrRefreshToken(i, initData);
        if (!token) return null;
        this.headers["Authorization"] = `Bearer ${token}`;

        const user = await this.userInfo(userId);
        if (user) {
          this.log(colors.green(`Balance: ${user.KlinkAirdropPoints}`));

          const dailyClaim = await this.dailyClaim(userId);
          if (dailyClaim.success) {
            this.log(colors.green(`Claim hằng ngày thành công`));
          } else {
            this.log(colors.yellow(`Bạn đã claim hôm nay rồi`));
          }

          const tap = await this.sendTap(userId);
          if (tap) {
            this.log(colors.green(`Tap thành công`));
          } else {
            this.log(colors.yellow("Energy không đủ để thực hiện tap"));
          }

          const mining = await this.startMining(userId);
          if (mining) {
            this.log(colors.green(`Bắt đầu mining`));
          } else {
            this.log(colors.yellow(`Không thể bắt đầu mining`));
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(40 * 60);
    }
  }
}

const client = new Klink();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
