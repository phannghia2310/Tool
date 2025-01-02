const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");

class PocketFi {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      Origin: "https://pocketfi.app",
      Referer: "https://pocketfi.app/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "cross-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
      "X-Paf-T": "Abvx2NzMTM==",
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

  async getUserMining(initData, axiosInstance) {
    const url = "https://gm.pocketfi.org/mining/getUserMining";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    try {
      const response = await axiosInstance.get(url, {
        headers: headers,
      });
      return response.data.userMining;
    } catch (error) {
      this.log(`Lỗi user: ${error.message}`, "error");
      return null;
    }
  }

  async claimMining(initData, axiosInstance) {
    const url = "https://gm.pocketfi.org/mining/claimMining";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    try {
      const response = await axiosInstance.post(url, null, {
        headers: headers,
      });
      this.log(
        `Claim thành công | Balance: ${response.data.userMining.gotAmount}`,
        "success"
      );
    } catch (error) {
      this.log(`Lỗi claim: ${error.message}`, "error");
    }
  }

  async getPumpTask(initData, axiosInstance) {
    const url = "https://bot.pocketfi.org/boost/tasks?boostType=pump";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    try {
      const response = await axiosInstance.get(url, {
        headers: headers,
      });
      return response.data;
    } catch (error) {
      this.log(`Lỗi pump task: ${error.message}`, "error");
      return null;
    }
  }

  async getGeneralTask(initData, axiosInstance) {
    const url = "https://bot.pocketfi.org/boost/tasks?boostType=general";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    try {
      const response = await axiosInstance.get(url, {
        headers: headers,
      });
      return response.data;
    } catch (error) {
      this.log(`Lỗi general task: ${error.message}`, "error");
      return null;
    }
  }

  async getPartnerTask(initData, axiosInstance) {
    const url = "https://bot.pocketfi.org/boost/tasks?boostType=partner";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    try {
      const response = await axiosInstance.get(url, {
        headers: headers,
      });
      return response.data;
    } catch (error) {
      this.log(`Lỗi partner task: ${error.message}`, "error");
      return null;
    }
  }

  async doTask(taskId, initData, axxiosInstance) {
    const url = "https://bot.pocketfi.org/confirmSubscription";
    const headers = {
      ...this.headers,
      Telegramrawdata: initData,
    };

    const data = {
      subscriptionType: taskId,
    };

    try {
      const response = await axxiosInstance.post(url, data, {
        headers: headers,
      });
      if (response.status == 200) {
        this.log(`Hoàn thành nhiệm vụ ${taskId}...`, "success");
      }
    } catch (error) {
      this.log(`Lỗi task: ${error.message}`, "error");
      return null;
    }
  }

  async manageTask(initData, axiosInstance) {
    const pumpTask = await this.getPumpTask(initData, axiosInstance);
    const generalTask = await this.getGeneralTask(initData, axiosInstance);
    const partnerTask = await this.getPartnerTask(initData, axiosInstance);

    const allTask = [
      ...pumpTask.tasks.pump,
      ...generalTask.tasks.connect,
      ...generalTask.tasks.daily,
      ...generalTask.tasks.subscriptions,
      ...generalTask.tasks.trade,
      ...partnerTask.tasks.partner,
    ];

    for (let task of allTask) {
      if (task.doneAmount == 0) {
        this.log(`Bắt đầu làm nhiệm vụ ${task.code}...`, "warning");
        await this.doTask(task.code, initData, axiosInstance);
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

        let proxyIP = "Unknown";
        let axiosInstance = axios.create({ headers: this.headers });

        if (i < this.proxyList.length) {
          try {
            proxyIP = await this.checkProxyIP(this.proxyList[i]);
            axiosInstance = this.dancayairdrop(this.proxyList[i]);
          } catch (error) {
            this.log(`Lỗi proxy ${i + 1}: ${error.message}`, "error");
            continue;
          }
        }

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} | ip: ${
            proxyIP.yellow
          } ==========`
        );

        const userMining = await this.getUserMining(initData, axiosInstance);

        if (userMining) {
          this.log(`Balance: ${userMining.gotAmount}`, "success");
          this.log(`Speed: ${userMining.speed}`, "success");
          this.log(`Mining score: ${userMining.miningAmount}`, "success");

          this.log("Bắt đầu claim...");
          await this.claimMining(initData, axiosInstance);

          this.log("Bắt đầu làm nhiệm vụ...");
          await this.manageTask(initData, axiosInstance);
        }
      }

      await this.countdown(5 * 60 * 60);
    }
  }
}

if (require.main === module) {
  const pineye = new PocketFi();
  pineye.main().catch((err) => {
    console.error(err.toString().red);
    process.exit(1);
  });
}
