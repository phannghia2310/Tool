const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { parse } = require("querystring");
const { DateTime } = require("luxon");

class DropsBot {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://miniapp.dropstab.com",
      Referer: "https://miniapp.dropstab.com/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
    };
    this.interval = 3;
  }

  setAuthorization(auth) {
    this.headers["Authorization"] = `Bearer ${auth}`.replace(/[\r\n\t]/g, "");
  }

  delAuthorization() {
    delete this.headers["Authorization"];
  }

  setXTgData(data) {
    this.headers["X-Tg-Data"] = data.replace(/[\r\n\t]/g, "");
  }

  delXTgData() {
    delete this.headers["X-Tg-Data"];
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

  async countdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(`===== Chờ ${i} giây để tiếp tục vòng lặp =====`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    this.log("", "info");
  }

  async http(url, data = null, headers) {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        let res;
        if (!data) {
          res = await axios.get(url, { headers });
        } else if (data === "") {
          res = await axios.post(url, null, { headers });
        } else {
          res = await axios.post(url, data, { headers });
        }
        return res;
      } catch (error) {
        console.log(error);
        console.log(colors.red("Lỗi kết nối"));
        retryCount++;
        if (retryCount < maxRetries) {
          await this.countdown(1);
        } else {
          throw new Error("Kết nối thất bại sau 3 lần thử");
        }
      }
    }
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
      this.error(colors.red(`Lỗi rồi: ${error.message}`));
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
      this.error(colors.red(`Đăng nhập thất bại ${id}: ${error.message}`));
      return null;
    }
    return token;
  }

  async getListTask(data) {
    const url = "https://api.miniapp.dropstab.com/api/quest";
    const headers = this.headers;

    try {
      const response = await this.http(url, null, headers);
      if (response.status === 200) {
        return response.data.flatMap((task) => task.quests);
      }
      return null;
    } catch (error) {
      this.log(colors.red(`Lỗi khi lấy danh sách nhiệm vụ: ${error.message}`));
      return null;
    }
  }

  async verifyTask(taskId, data, maxRetries = 5) {
    const url = `https://api.miniapp.dropstab.com/api/quest/${taskId}/verify`;
    const headers = this.headers;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.put(url, {}, { headers });

        if (response.status === 200) {
          if (response.data.status === "OK") {
            return true;
          }
        }

        if (res.data.code === 400) {
          this.log(
            colors.yellow(
              `Gặp lỗi cho nhiệm vụ ${taskId}. thử lại ${attempt}/${maxRetries}`
            )
          );

          if (attempt < maxRetries) {
            const waitTime = 5;
            this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
            await this.countdown(waitTime);
          } else {
            this.log(
              colors.red(
                `Đã thử ${maxRetries} lần nhưng vẫn gặp lỗi cho nhiệm vụ ${taskId}`
              )
            );
            return false;
          }
        } else {
          return false;
        }
      } catch (error) {
        this.log(
          colors.red(
            `Lỗi khi bắt đầu nhiệm vụ ${taskId} (lần thử ${attempt}/${maxRetries}):`
          )
        );

        if (attempt < maxRetries) {
          const waitTime = 5;
          this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
          await this.countdown(waitTime);
        } else {
          return false;
        }
      }
    }

    return false;
  }

  async claimTask(taskId, data, maxRetries = 5) {
    const url = `https://api.miniapp.dropstab.com/api/quest/${taskId}/claim`;
    const headers = this.headers;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await axios.put(url, {}, { headers });

        if (response.status === 200) {
          if (response.data.status === "OK") {
            return true;
          }
        }

        if (res.data.code === 400) {
          this.log(
            colors.yellow(
              `Gặp lỗi cho nhiệm vụ ${taskId}. thử lại ${attempt}/${maxRetries}`
            )
          );

          if (attempt < maxRetries) {
            const waitTime = 5;
            this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
            await this.countdown(waitTime);
          } else {
            this.log(
              colors.red(
                `Đã thử ${maxRetries} lần nhưng vẫn gặp lỗi cho nhiệm vụ ${taskId}`
              )
            );
            return false;
          }
        } else {
          return false;
        }
      } catch (error) {
        this.log(
          colors.red(
            `Lỗi khi bắt đầu nhiệm vụ ${taskId} (lần thử ${attempt}/${maxRetries}):`
          )
        );

        if (attempt < maxRetries) {
          const waitTime = 5;
          this.log(colors.blue(`Chờ ${waitTime} giây trước khi thử lại...`));
          await this.countdown(waitTime);
        } else {
          return false;
        }
      }
    }

    return false;
  }

  async processTask(tasks, data, maxRetries = 5) {
    for (const task of tasks) {
      if (task.status === "NEW" && task.claimAllowed === false) {
        const startVerify = await this.verifyTask(task.id, data, maxRetries);
        if (startVerify) {
          this.log(`Bắt đầu verify nhiệm vụ ${task.name}`, "info");
        }
      } else if (task.status === "VERIFYCATION") {
        this.log(`Verify nhiệm vụ ${task.name} thành công`, "success");
      } else if (task.status === "NEW" && task.claimAllowed === true) {
        const startClaim = await this.claimTask(task.id, data, maxRetries);
        if (startClaim) {
          this.log(
            `Claim nhiệm vụ ${task.name} thành công nhận: $${task.reward} DPS`,
            "success"
          );
        }
      } else if (!task.claimAllowed) {
        this.log(`Bạn đã claim nhiệm vụ ${task.name} rồi`, "warning");
      } else {
        this.log(`Nhiệm vụ ${task.name} chưa hoàn thành`, "error");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  async manageTasks(data) {
    const tasks = await this.getListTask(data);
    if (!tasks) return;

    await this.processTask(tasks, data);
  }

  async getCoin(data) {
    const url = "https://api.miniapp.dropstab.com/api/order/coins";
    const headers = this.headers;

    try {
      const response = await axios.get(url, { headers });
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.log(colors.red(`Lỗi khi lấy danh sách coins: ${error.message}`));
      return null;
    }
  }

  async getOrder(data) {
    const url = "https://api.miniapp.dropstab.com/api/order";
    const headers = this.headers;

    try {
      const response = await axios.get(url, { headers });
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.log(colors.red(`Lỗi khi lấy danh sách order: ${error.message}`));
      return null;
    }
  }

  async startOrder(payload, data) {
    const url = "https://api.miniapp.dropstab.com/api/order";
    const headers = this.headers;

    try {
      const response = await this.http(url, payload, headers);
      if (response.status === 200) {
        return true;
      }
      return false;
    } catch (error) {
      this.log(colors.red(`Không thể bắt đầu order: ${error.message}`));
      return null;
    }
  }

  async claimOrder(orderId, data) {
    const url = `https://api.miniapp.dropstab.com/api/order/${orderId}/claim`;
    const headers = this.headers;
    try {
      const response = await axios.put(url, {}, { headers });
      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      this.log(colors.red(`Lỗi khi claim order: ${error.message}`));
      return null;
    }
  }

  async playOrder(period, data) {
    const askCoin = 1;
    const coinId = parseInt(askCoin);
    const short = Math.random() > 0.5 ? false : true;
    const payload = {
      coinId: coinId,
      short: short,
      periodId: period.period.id,
    };

    const orderResponse = await this.startOrder(payload, data);
    if (orderResponse) {
      this.log("Order thành công!", "success");
    }
  }

  async processPeriod(periods, score, data) {
    for (const period of periods) {
      if (period.period.unlockThreshold > score) {
        this.log(
          `Điểm hiện tại của bạn chưa đủ để mở khóa periord này (${period.period.unlockThreshold})`,
          "warning"
        );
      } else if (period.order) {
        const order = period.order;
        if (order.status === "PENDING") {
          this.log(`Bạn đã order periord ${period.period.hours} giờ!`, "info");
          this.log(
            `Coin: ${order.coin.name} | Lệnh: ${
              order.short ? "Short" : "Long"
            } | Giá hiện tại: ${order.priceEntry} | Trạng thái: ${
              order.status
            }`,
            "success"
          );
        } else if (order.status === "NOT_WIN") {
          this.log(
            `Bạn đã thua periord ${period.period.hours} giờ! Bắt đầu order lại...`,
            "error"
          );
          await this.playOrder(period, data);
        } else {
          const claimResponse = await this.claimOrder(order.id, data);
          this.log(
            `Claim thành công ${claimResponse.totalScore}! Bắt đầu order lại...`,
            "success"
          );

          await this.playOrder(period, data);
        }
      } else {
        this.log(`Bắt đầu order period ${period.period.hours} giờ!`);
        await this.playOrder(period, data);
      }
    }
  }

  async manageOrder(data) {
    const order = await this.getOrder(data);
    if (!order) return;
    this.log("========== Thông tin order ==========", "info");
    this.log(`Tổng điểm: ${order.totalScore}`, "success");
    const result = order.results;
    console.log(
      `Orders: ${result.orders} | Win: ${result.wins} | Lose: ${result.loses} | Streak: ${result.streak.count}`
    );

    await this.processPeriod(order.periods, order.totalScore, data);
  }

  async login(data) {
    const url = "https://api.miniapp.dropstab.com/api/auth/login";
    const payload = {
      webAppData: data,
    };
    const headers = this.headers;

    this.delAuthorization();
    try {
      const response = await this.http(url, payload, headers);
      if (response.status !== 200) {
        this.log(
          colors.red(`Login không thành công! Mã trạng thái: ${res.status}`)
        );
        return null;
      }
      return response.data.jwt.access.token;
    } catch (error) {
      this.log(colors.red(`Lỗi trong quá trình đăng nhập: ${error.message}`));
      return null;
    }
  }

  async getCurrent(data) {
    const url = "https://api.miniapp.dropstab.com/api/user/current";
    const headers = this.headers;

    try {
      const response = await axios.get(url, { headers });
      if (response.status === 200) {
        return response.data.balance;
      }
      return null;
    } catch (error) {
      this.log(error.message, "error");
      return null;
    }
  }

  async processAccount(data, index, hoinhiemvu) {
    if (!data || data.trim() === "") {
      return null;
    }

    this.delXTgData();
    try {
      const parser = parse(data);
      const user = JSON.parse(parser.user);
      const id = user.id;
      const username = user.first_name;

      console.log(
        `========== Tài khoản ${index + 1} | ${username.green} ==========`
      );

      const token = await this.getOrRefreshToken(id, data);
      if (!token) return null;

      this.setAuthorization(token);
      this.setXTgData(data);

      const balance = await this.getCurrent(data);
      this.log(`Balance hiện tại: ${balance}`);

      if (hoinhiemvu) {
        await this.manageTasks(data);
      }
      await this.manageOrder(data);
    } catch (error) {
      console.error(
        colors.red(`Lỗi xử lý tài khoản ${index + 1}: ${error.message}`)
      );
      return null;
    }
  }

  askQuestion(query) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    return new Promise((resolve) =>
      rl.question(query, (ans) => {
        rl.close();
        resolve(ans);
      })
    );
  }

  async main() {
    const args = require("yargs").argv;
    const dataFile = args.data || "data.txt";
    const marinkitagawa = args.marinkitagawa || false;
    if (!marinkitagawa) {
      console.clear();
    }
    const datas = this.loadData(dataFile);

    const nhiemvu = await this.askQuestion(
      "Bạn có muốn làm nhiệm vụ không? (y/n): "
    );
    const hoinhiemvu = nhiemvu.toLowerCase() === "y";

    while (true) {
      const listCountdown = [];

      for (let i = 0; i < datas.length; i++) {
        try {
          const result = await this.processAccount(datas[i], i, hoinhiemvu);
          if (result !== null) {
            listCountdown.push(result);
          }
        } catch (error) {
          console.error(
            colors.red(`Error processing account ${i + 1}: ${error.message}`)
          );
          continue;
        }
        await this.countdown(this.interval);
      }

      await this.countdown(60 * 60);
    }
  }
}

(async () => {
  try {
    const app = new DropsBot();
    await app.main();
  } catch (error) {
    console.error(error);
    process.exit();
  }
})();
