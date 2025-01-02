const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline");
const colors = require("colors");
const { HttpsProxyAgent } = require("https-proxy-agent");

class CryptoRank {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9",
      "Content-Type": "application/json",
      Origin: "https://tma.cryptorank.io",
      Referer: "https://tma.cryptorank.io/",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    };
    this.proxyList = [];
    this.loadProxies();
  }

  setAuthorization(token) {
    this.headers["Authorization"] = token;
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

  async account(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account";

    try {
      const response = await axiosInstance.get(url, { headers: this.headers });
      return response.data;
    } catch (err) {
      this.log(`Lỗi tài khoản ${err.message}`, "error");
      return null;
    }
  }

  async startFarming(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account/start-farming";

    try {
      const response = await axiosInstance.post(url, null, { headers: this.headers });
      return response.data;
    } catch (err) {
      this.log(`Lỗi tài khoản ${err.message}`, "error");
      return null;
    }
  }

  async endFarming(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account/end-farming";

    try {
      const response = await axiosInstance.post(url, null, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      this.log(`Lỗi tài khoản ${error.message}`, "error");
      return null;
    }
  }

  async getBuddies(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account/buddies";

    try {
      const response = await axiosInstance.get(url, { headers: this.headers });
      return response.data;
    } catch (err) {
      this.log(`Lỗi lấy buddies ${err.message}`, "error");
      return null;
    }
  }

  async claimBuddies(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account/claim/buddies";
    
    try {
      const response = await axiosInstance.post(url, null, {
        headers: this.headers,
      });
  
      return response.data;
    } catch (err) {
      this.log(`Lỗi claim buddies ${err.message}`, "error");
      return null;
    }
  }

  async manageBuddies(axiosInstance) {
    const buddies = await this.getBuddies(axiosInstance);

    if (buddies.reward == 0) {
      this.log("Không có reward để claim", "warning");
    } else if (buddies.cooldown > 0) {
      this.log(`Cooldown: ${buddies.cooldown} giây`, "warning");
    } else {
      this.log(`Bắt đầu claim reward ${buddies.reward}...`, "custom");
      const claim = await this.claimBuddies(axiosInstance);
      if (claim) {
        this.log(`Claim thành công | Balance: ${claim.balance}`, "success");
      }
    }
  }

  async getTasks(axiosInstance) {
    const url = "https://api.cryptorank.io/v0/tma/account/tasks";

    try {
      const response = await axiosInstance.get(url, { headers: this.headers });
      return response.data;
    } catch (err) {
      this.log(`Lỗi lấy task ${err.message}`, "error");
      return null;
    }
  }

  async claimTask(taskId, axiosInstance) {
    const url = `https://api.cryptorank.io/v0/tma/account/claim/task/${taskId}`;

    try {
      const response = await axiosInstance.post(url, {}, { headers: this.headers });
      if (response.status == 201) {
        this.log(
          `Claim thành công | Balance: ${response.data.balance}`,
          "success"
        );
      } else if (response.status == 409) {
        this.log(`Nhiệm vụ đã được claim`, "warning");
      }
    } catch (err) {
      this.log(`Lỗi claim task ${err.message}`, "error");
    }
  }

  async manageTasks(axiosInstance) {
    const tasks = await this.getTasks(axiosInstance);

    for (let task of tasks) {
      if (JSON.stringify(task.isDone) === "false") {
        this.log(`Bắt đầu làm nhiệm vụ ${task.name}...`, "custom");
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await this.claimTask(task.id, axiosInstance);
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
        const token = data[i];

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
          `========== ${("Tài khoản " + (i + 1)).green} | ip: ${
            proxyIP.yellow
          } ==========`
        );

        this.setAuthorization(token);
        const accountResponse = await this.account(axiosInstance);

        if (accountResponse) {
          this.log(`Balance: ${accountResponse.balance}`, "success");
          if (accountResponse.farming.state == "END") {
            this.log("Bắt đầu farming...", "custom");
            await this.startFarming(axiosInstance);
          } else {
            const curTime = Date.now();
            const endTime =
              accountResponse.farming.timestamp + 6 * 60 * 60 * 1000;

            if (curTime > endTime) {
              this.log("Bắt đầu claim farming...", "custom");
              const farmResult = await this.endFarming(axiosInstance);
              if (farmResult) {
                this.log(
                  colors.green(
                    `Claim thành công | Balance: ${farmResult.balance}`
                  )
                );
                this.log("Bắt đầu farming...", "custom");

                await new Promise((resolve) => setTimeout(resolve, 3000));
                await this.startFarming(axiosInstance);
              }
            } else {
              this.log(
                colors.yellow(
                  `Chưa đến lúc claim chờ ${endTime - curTime} giây...`
                )
              );
            }
          }

          await this.manageBuddies(axiosInstance);
          await this.manageTasks(axiosInstance);
        }
      }
      await this.countdown(6 * 60 * 60);
    }
  }
}

if (require.main === module) {
  const pineye = new CryptoRank();
  pineye.main().catch((err) => {
    console.error(err.toString().red);
    process.exit(1);
  });
}
