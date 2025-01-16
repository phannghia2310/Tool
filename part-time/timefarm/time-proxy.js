const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { parse } = require("querystring");
const { DateTime } = require("luxon");
const { HttpsProxyAgent } = require("https-proxy-agent");

class TimeFarm {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "vi,fr-FR;q=0.9,fr;q=0.8,en-US;q=0.7,en;q=0.6",
      "Content-Type": "application/json",
      Origin: "https://timefarm.app",
      Referer: "https://timefarm.app/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    };
    this.interval = 3;
    this.proxies = this.loadProxies("proxy.txt");
  }

  loadProxies(file) {
    const proxies = fs
      .readFileSync(file, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    if (proxies.length <= 0) {
      console.log(colors.red(`Không tìm thấy proxy`));
      process.exit();
    }
    return proxies;
  }

  async checkProxyIP(proxy) {
    try {
      const proxyAgent = new HttpsProxyAgent(proxy);
      const response = await axios.get("https://api.ipify.org?format=json", {
        httpsAgent: proxyAgent,
      });
      if (response.status === 200) {
        return response.data.ip;
      } else {
        throw new Error(
          `Không thể kiểm tra IP của proxy. Status code: ${response.status}`
        );
      }
    } catch (error) {
      throw new Error(`Error khi kiểm tra IP của proxy: ${error.message}`);
    }
  }

  async getProxyIP(proxy) {
    try {
      return await this.checkProxyIP(proxy);
    } catch (error) {
      return "Unknown";
    }
  }

  setAuthorization(auth) {
    this.headers["Authorization"] = `Bearer ${auth}`;
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

  async getOrRefreshToken(id, data, proxy) {
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
      token = await this.login(data, proxy);
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

  async login(initData, proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/auth/validate-init/v2";
    const payload = {
      initData: initData.replace(/[\r\n\t]/g, ""),
      platform: "android",
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
        httpsAgent: new HttpsProxyAgent(proxy),
      });
      return response.data.token;
    } catch (error) {
      this.log(colors.red(`Lỗi đăng nhập: ${error.message}`));
    }
  }

  async info(proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/farming/info";

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        httpsAgent: new HttpsProxyAgent(proxy),
      });
      return response.data;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy thông tin tài khoản: ${error.message}`));
      return null;
    }
  }

  async finishFarm(proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/farming/finish";

    try {
      const response = await axios.post(
        url,
        {},
        { headers: this.headers, httpsAgent: new HttpsProxyAgent(proxy) }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async startFarm(proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/farming/start";

    try {
      const response = await axios.post(
        url,
        {},
        { headers: this.headers, httpsAgent: new HttpsProxyAgent(proxy) }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageFarm(proxy) {
    const finish = await this.finishFarm(proxy);
    if (finish) {
      this.log(
        colors.green(`Claim farm thành công | Balance: ${finish.balance}`)
      );

      const start = await this.startFarm(proxy);
      if (start) {
        this.log(
          colors.green(`Bắt đầu farm lúc ${start.activeFarmingStartedAt}`)
        );
      } else {
        this.log(colors.yellow(`Tiến trình farm đang được thực hiện`));
      }
    } else {
      const start = await this.startFarm(proxy);
      if (start) {
        this.log(
          colors.green(`Bắt đầu farm lúc ${start.activeFarmingStartedAt}`)
        );
      } else {
        this.log(colors.yellow(`Tiến trình farm đang được thực hiện`));
      }
    }
  }

  async getTask(proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/tasks";

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        httpsAgent: new HttpsProxyAgent(proxy),
      });
      return response.data;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy danh sách nhiệm vụ: ${error.message}`));
      return null;
    }
  }

  async submitTask(taskId, proxy) {
    const url = "https://tg-bot-tap.laborx.io/api/v1/tasks/submissions";
    const payload = {
      taskId: taskId,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
        httpsAgent: new HttpsProxyAgent(proxy),
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getClaimResult(taskId, proxy) {
    const url = `https://tg-bot-tap.laborx.io/api/v1/tasks/${taskId}`;

    try {
      const response = await axios.get(url, {
        headers: this.headers,
        httpsAgent: new HttpsProxyAgent(proxy),
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async claimTask(taskId, proxy) {
    const url = `https://tg-bot-tap.laborx.io/api/v1/tasks/${taskId}/claims`;

    try {
      const response = await axios.post(
        url,
        {},
        { headers: this.headers, httpsAgent: new HttpsProxyAgent(proxy) }
      );
      if (response.status == 200) {
        await this.getClaimResult(taskId, proxy);
      }
      return true;
    } catch (error) {
      return null;
    }
  }

  async manageTask(proxy) {
    const tasks = await this.getTask(proxy);

    for (let task of tasks) {
      if (task.submission) {
        const submission = task.submission;
        if (submission.status == "CLAIMED") {
          continue;
        } else if (submission.status == "SUBMITTED") {
          continue;
        } else if (submission.status == "COMPLETED") {
          const claim = await this.claimTask(task.id);
          if (claim) {
            this.log(
              colors.green(
                `Claim thành công nhiệm vụ ${task.title}, nhận thưởng: ${task.reward} points`
              )
            );
          } else {
            this.log(colors.red(`Không thể claim nhiệm vụ ${task.title}`));
          }
        }
      } else {
        const submit = await this.submitTask(task.id, proxy);
        if (submit) {
          this.log(colors.cyan(`Submit thành công nhiệm vụ ${task.title}...`));
          const claim = await this.claimTask(task.id, proxy);
          if (claim) {
            this.log(
              colors.green(
                `Claim thành công nhiệm vụ ${task.title}, nhận thưởng: ${task.reward} points`
              )
            );
          } else {
            this.log(colors.red(`Không thể claim nhiệm vụ ${task.title}`));
          }
        } else {
          this.log(
            colors.red(`Không thể submit nhiệm vụ ${task.title} | Cần tự làm`)
          );
        }
      }
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
      const proxy = this.proxies[index % this.proxies.length];

      let proxyIP = await this.getProxyIP(proxy);
      console.log(
        `========== Tài khoản ${index + 1} | ${username.green} | ${
          proxyIP.yellow
        } ==========`
      );

      const token = await this.getOrRefreshToken(id, data, proxy);
      if (!token) return null;

      this.setAuthorization(token);

      const userInfo = await this.info(proxy);
      if (userInfo) {
        this.log(colors.green(`Balance: ${userInfo.balance}`));

        await this.manageFarm(proxy);
        if (hoinhiemvu) {
          await this.manageTask(proxy);
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

      await this.countdown(4 * 60 * 60);
    }
  }
}

(async () => {
  try {
    const app = new TimeFarm();
    await app.main();
  } catch (error) {
    console.error(error);
    process.exit();
  }
})();
