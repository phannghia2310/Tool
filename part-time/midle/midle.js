const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline");
const colors = require("colors");
const { DateTime } = require("luxon");
const { ethers } = require("ethers");
const { HttpsProxyAgent } = require("https-proxy-agent");

class MidleAirdrop {
  constructor() {
    this.headers = {
      "Content-Type": "application/json; charset=utf-8",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Origin": "https://app.midle.io",
      "Referer": "https://app.midle.io/",
    };
    this.proxyList = [];
    this.loadProxies();
  }

  loadProxies() {
    try {
      const proxyFile = path.join(__dirname, "proxy.txt");
      this.proxyList = fs
        .readFileSync(proxyFile, "utf8")
        .replace(/\r/g, "")
        .split("\n")
        .filter(Boolean);
    } catch (error) {
      this.log("Không thể đọc file proxy.txt", "error");
      process.exit(1);
    }
  }

  async checkProxyIP(proxy) {
    try {
      const proxyAgent = new HttpsProxyAgent(proxy);
      const response = await axios.get("https://api.ipify.org?format=json", {
        httpsAgent: proxyAgent,
        timeout: 10000,
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

  dancayairdrop(proxy) {
    const proxyAgent = new HttpsProxyAgent(proxy);
    return axios.create({
      httpsAgent: proxyAgent,
      timeout: 30000,
      headers: this.headers,
    });
  }

  setApikey(type) {
    this.headers["Apikey"] = type;
  }

  delApikey() {
    delete this.headers["Apikey"];
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

  async countdown(seconds) {
    for (let i = seconds; i >= 0; i--) {
      readline.cursorTo(process.stdout, 0);
      process.stdout.write(
        `[${new Date().toLocaleTimeString()}] [*] Chờ ${i} giây để tiếp tục...`
      );
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    console.log("");
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

  async getOrRefreshToken(id, wallet, key) {
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
      token = await this.login(wallet, key);
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

  async getMessage(wallet) {
    const url = `https://backend-v2.midle.io/v1/auth/wallet/metamaskloginmessage?wallet=${wallet}`;

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.message;
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  async createSignature(key, message) {
    const infuraUrl =
      "https://mainnet.infura.io/v3/dae67ebd00c44fe9a63cd44d74811e2a";

    const provider = new ethers.JsonRpcProvider(infuraUrl);
    const wallet = new ethers.Wallet(key, provider);
    const signature = await wallet.signMessage(message);

    return signature;
  }

  async login(wallet, key) {
    const message = await this.getMessage(wallet);
    const signature = await this.createSignature(key, message);

    const url = "https://backend-v2.midle.io/v1/auth/wallet";
    const payload = {
      accountAddress: wallet,
      message: message,
      signature: signature,
      ref: "678f757a21dc9ee3828c6d8f",
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.accessToken;
    } catch (error) {
      return null;
    }
  }

  async getUserId() {
    const url =
      "https://backend-v2.midle.io/v1/customers/by-username/midleairdrop";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.id;
    } catch (error) {
      return null;
    }
  }

  async getTasks(userId) {
    const url = `https://backend-v2.midle.io/v1/task/filter?page=1&limit=50&customer=${userId}`;

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.list;
    } catch (error) {
      return null;
    }
  }

  async verifyTask(taskId) {
    const url = `https://backend-v2.midle.io/v1/task/verify/${taskId}`;

    try {
      const response = await axios.post(url, null, { headers: this.headers });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageTask(userId) {
    const tasks = await this.getTasks(userId);

    if (tasks) {
      this.log(colors.cyan(`Bắt đầu làm nhiệm vụ...`));
      for (const task of tasks) {
        await this.countdown(3);
        const verify = await this.verifyTask(task.id);
        if (verify) {
          this.log(colors.green(`Hoàn thành nhiệm vụ ${task.title.en}`));
        } else {
          this.log(colors.red(`Không thể làm nhiệm vụ ${task.title.en}`));
        }
      }
    }
  }

  distributeWallets(wallets, proxies) {
    const groups = Array.from({ length: proxies.length }, () => []);
    wallets.forEach((wallet, index) => {
      const proxyIndex = index % proxies.length;
      groups[proxyIndex].push(wallet);
    });
    return groups;
  }

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    this.setApikey(data[0]);

    const walletFile = path.join(__dirname, "wallet.txt");
    const wallets = fs
      .readFileSync(walletFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    if (wallets.length === 0) {
      this.log("Tệp wallet.txt không chứa dữ liệu hoặc bị thiếu.", "error");
      process.exit(1);
    }

    const privateFile = path.join(__dirname, "private.txt");
    const privateKeys = fs
      .readFileSync(privateFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    if (privateKeys.length === 0) {
      this.log("Tệp private.txt không chứa dữ liệu hoặc bị thiếu.", "error");
      process.exit(1);
    }

    if (wallets.length !== privateKeys.length) {
      this.log(
        "Số lượng ví trong wallet.txt không khớp với số private keys trong private.txt.",
        "error"
      );
      process.exit(1);
    }

    const proxyGroups = this.distributeWallets(wallets, this.proxyList);

    while (true) {
      for (let proxyIndex = 0; proxyIndex < proxyGroups.length; proxyIndex++) {
        const proxy = this.proxyList[proxyIndex];
        const groupWallets = proxyGroups[proxyIndex];

        let proxyIP = "Unknown";
        let axiosInstance = axios.create({ headers: this.headers });

        // Kiểm tra và gán proxy cho axiosInstance
        if (proxyIndex < this.proxyList.length) {
          try {
            proxyIP = await this.checkProxyIP(this.proxyList[proxyIndex]);
            axiosInstance = this.dancayairdrop(this.proxyList[proxyIndex]);
            this.log(`Sử dụng proxy: ${proxy} (IP: ${proxyIP})`, "info");
          } catch (error) {
            this.log(`Lỗi proxy ${proxyIndex + 1}: ${error.message}`, "error");
            continue; // Bỏ qua proxy lỗi và chuyển sang proxy tiếp theo
          }
        }

        for (let i = 0; i < groupWallets.length; i++) {
          const wallet = groupWallets[i];
          const key = privateKeys[wallets.indexOf(wallet)];

          console.log(
            `========== ${("Tài khoản " + wallet).green} | ip: ${
              proxyIP.yellow
            } ==========`
          );

          const token = await this.getOrRefreshToken(
            wallets.indexOf(wallet),
            wallet,
            key
          );
          if (!token) return null;
          this.setAuthorization(token);

          const userId = await this.getUserId();
          if (userId) {
            await this.manageTask(userId);
          } else {
            this.log(colors.red("Không lấy được user id"));
          }

          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      await this.countdown(3 * 60 * 60);
    }
  }
}

if (require.main === module) {
  const midle = new MidleAirdrop();
  midle.main().catch((err) => {
    console.error(err.toString().red);
    process.exit(1);
  });
}
