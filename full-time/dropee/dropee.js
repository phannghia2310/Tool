const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { parse } = require("querystring");
const { DateTime } = require("luxon");

class Dropee {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "vi,fr-FR;q=0.9,fr;q=0.8,en-US;q=0.7,en;q=0.6",
      "Content-Type": "application/json",
      Origin: "https://webapp.game.dropee.xyz",
      Referer: "https://webapp.game.dropee.xyz/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "X-Preview-Season": "betav2",
    };
    this.interval = 3;
  }

  setAuthorization(auth) {
    this.headers["Authorization"] = `Bearer ${auth}`.replace(/[\r\n\t]/g, "");
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

  async login(initData) {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/telegram/me";
    const payload = {
      initData: initData.replace(/[\r\n\t]/g, ""),
      referrerCode: "Eh7HeMxVdZv",
      utmSource: null,
      impersonationToken: null,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.token;
    } catch (error) {
      this.log(colors.red(`Lỗi đăng nhập: ${error.message}`));
    }
  }

  async getMe() {
    const url = "https://dropee.clicker-game-api.tropee.com/api/game/sync";
    const payload = {
      initialSync: true,
      utmSource: null,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.playerStats;
    } catch (error) {
      return null;
    }
  }

  async tap(availableEnergy) {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/tap";
    const payload = {
      availableEnergy: availableEnergy,
      duration: Math.random() * 10,
      count: 5000,
      startTimestamp: Math.floor(Date.now() / 1000),
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      this.log(
        colors.green(`Tap thành công | Balance: ${response.data.coins}`)
      );
    } catch (error) {
      this.log(colors.red(`Lỗi tap: ${error.message}`));
    }
  }

  async dailyCheckin() {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/tasks/daily-checkin?v=2";

    try {
      const response = await axios.post(url, {}, { headers: this.headers });
      if (response.status == 200) {
        this.log(colors.green(`Điểm danh thành công!`));
        return response.data.playerStats.tasks;
      }
    } catch (error) {
      this.log(colors.red(`Lỗi điểm danh: ${error.message}`));
      return null;
    }
  }

  async getTasks() {
    const url = "https://dropee.clicker-game-api.tropee.com/api/game/config";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.config.tasks;
    } catch (error) {
      return null;
    }
  }

  async verifyTask(taskId) {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/tasks/action-completed";
    const payload = {
      taskId: taskId,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async doneTask(taskId) {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/tasks/done";
    const payload = {
      taskId: taskId,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageTask() {
    const tasks = await this.getTasks();

    if (tasks) {
      for (let task of tasks) {
        if (task.isDone) {
          continue;
        } else if (!task.isDone && task.isVerified) {
          const done = await this.doneTask(task.id);
          if (done) {
            this.log(
              colors.green(
                `Claim thành công nhiệm vụ ${task.title}, nhận được: ${task.reward}`
              )
            );
          } else {
            this.log(
              colors.yellow(`Không thể claim nhiệm vụ ${task.title}...`)
            );
          }
        } else {
          const verify = await this.verifyTask(task.id);
          if (verify) {
            this.log(colors.green(`Verify thành công nhiệm vụ ${task.title}`));

            const done = await this.doneTask(task.id);
            if (done) {
              this.log(
                colors.green(
                  `Claim thành công nhiệm vụ ${task.title}, nhận được: ${task.reward}`
                )
              );
            } else {
              this.log(
                colors.yellow(`Không thể claim nhiệm vụ ${task.title}...`)
              );
            }
          } else {
            this.log(
              colors.yellow(`Không thể verify nhiệm vụ ${task.title}...`)
            );
          }
        }
      }
    } else {
      this.log(colors.yellow(`Không thể lấy danh sách nhiệm vụ...`));
    }
  }

  async getSpinState() {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/fortune-wheel";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.state.spins;
    } catch (error) {
      return null;
    }
  }

  async spin() {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/fortune-wheel/spin";
    const payload = {
      version: 2,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.prize;
    } catch (error) {
      return null;
    }
  }

  async manageSpin() {
    const spinState = await this.getSpinState();
    if (spinState) {
      let ticket = spinState.available;

      if (ticket == 0) {
        this.log(colors.yellow(`Bạn đã hết lượt quay....`));
      }

      while (ticket > 0) {
        this.log(colors.cyan(`Lượt chơi còn lại: ${ticket}`));
        const spin = await this.spin();
        if (spin) {
          this.log(
            colors.green(
              `Spin thành công, nhận được: ${spin.amount} ${spin.type}`
            )
          );
        } else {
          this.log(colors.red(`Không thể thực hiện spin...`));
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
        ticket--;
      }
    } else {
      this.log(colors.red(`Không lấy được trạng thái spin...`));
    }
  }

  async getUpgrade() {
    const url = "https://dropee.clicker-game-api.tropee.com/api/game/config";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.config.upgrades;
    } catch (error) {
      return null;
    }
  }

  async upgrade(upgradeId) {
    const url =
      "https://dropee.clicker-game-api.tropee.com/api/game/actions/upgrade";
    const payload = {
      upgradeId: upgradeId,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.playerStats;
    } catch (error) {
      return null;
    }
  }

  async manageUpgrade(balance) {
    const upgrades = await this.getUpgrade();
    if (!upgrades) return;

    const configPath = path.join(__dirname, "config.json");
    let maxCost = 1000000;
    try {
      if (fs.existsSync(configPath)) {
        const configData = fs.readFileSync(configPath, "utf8");
        const config = JSON.parse(configData);
        if (config.maxCost) {
          maxCost = config.maxCost;
        }
      } else {
        fs.writeFileSync(
          configPath,
          JSON.stringify({ maxCost: 1000000 }, null, 2),
          "utf8"
        );
      }

      let allCards = upgrades.sort((a, b) => b.profit - a.profit);

      for (let card of allCards) {
        if (balance >= card.price && card.price <= maxCost) {
          const upgradeResult = await this.upgrade(card.id);
          balance = upgradeResult.coins;
          this.log(`Mua thẻ "${card.name}" thành công | Profit: ${card.profit} | Balance còn: ${balance}`, 'success');
        }
      }
    } catch (error) {
      this.log(`Không thể đọc file config.json: ${error.message}`, "error");
    }
  }

  async processAccount(data, index, hoinhiemvu) {
    if (!data || data.trim() === "") {
      return null;
    }

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

      const info = await this.getMe();
      if (info) {
        this.log(colors.green(`Balance: ${info.coins}`));
        this.log(colors.green(`Energy: ${info.energy.available}`));
        this.log(colors.green(`Profit: ${info.profit}`));

        if (info.tasks.dailyCheckin.consecutiveDays == 0) {
          await this.dailyCheckin();
        } else {
          this.log(colors.yellow(`Bạn đã điểm danh hôm nay rồi...`));
        }

        if (hoinhiemvu) {
          await this.manageTask();
        }

        this.log(colors.blue("Bắt đầu spin..."));
        await this.manageSpin();

        this.log(colors.blue("Bắt đầu nâng cấp thẻ..."));
        await this.manageUpgrade(info.coins);

        let tapTicket = 10;
        this.log(colors.blue(`Bắt đầu tap (tối đa ${tapTicket} lần)...`));
        while (tapTicket > 0) {
          await this.tap(info.energy.available);
          await new Promise((resolve) => setTimeout(resolve, 1500));
          tapTicket--;
        }
      }
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(60);
    }
  }
}

(async () => {
  try {
    const app = new Dropee();
    await app.main();
  } catch (error) {
    console.error(error);
    process.exit();
  }
})();
