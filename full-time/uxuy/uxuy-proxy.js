const fs = require("fs");
const path = require("path");
const axios = require("axios");
const readline = require("readline");
const colors = require("colors");
const FormData = require("form-data");
const querystring = require("querystring");
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

  setContentType(type) {
    this.headers["Content-Type"] = type;
  }

  delContentType() {
    delete this.headers["Content-Type"];
  }

  setAuthorization(token) {
    this.headers["Authorization"] = `Bearer ${token}`;
  }

  delAuthorization() {
    delete this.headers["Authorization"];
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

  async jwt(initData, axiosInstance) {
    const url = "https://miniapp.uxuy.one/jwt";

    const parsedInput = initData.split("&").reduce((acc, pair) => {
      const [key, value] = pair.split("=");
      acc[decodeURIComponent(key)] = decodeURIComponent(value);
      return acc;
    }, {});
    const formData = querystring.stringify(parsedInput);

    this.setContentType("application/x-www-form-urlencoded");
    this.delAuthorization();

    try {
      const response = await axiosInstance.post(url, formData, {
        headers: this.headers,
      });
      this.setAuthorization(response.data.jwtData);
    } catch (error) {
      this.log(`Lấy token lỗi: ${error.message}`, "error");
    }
  }

  async farmInfo(axiosInstance) {
    const url = "https://miniapp.uxuy.one/rpc";
    const payload = {
      method: "wallet_getFarmInfo",
      params: [],
      id: 425482576,
      jsonrpc: "2.0",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data.result;
    } catch (error) {
      this.log(`Lấy thông tin lỗi: ${error.message}`, "error");
      return null;
    }
  }

  async claimFarm(params, axiosInstance) {
    const url = "https://miniapp.uxuy.one/rpc";
    const payload = {
      method: "wallet_claimFarm",
      params: params,
      id: 425482576,
      jsonrpc: "2.0",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data.result;
    } catch (error) {
      this.log(`Nhận thưởng lỗi: ${error.message}`, "error");
      return null;
    }
  }

  async getAdsTask(axiosInstance) {
    const url = "https://miniapp.uxuy.one/rpc";
    const payload = {
      method: "wallet_adsList2",
      params: [false],
      id: 959535048,
      jsonrpc: "2.0",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data.result.items;
    } catch (error) {
      this.log(`Lấy nhiệm vụ lỗi: ${error.message}`, "error");
      return null;
    }
  }

  async clickAdsTask(taskId, axiosInstance) {
    const url = "https://miniapp.uxuy.one/rpc";
    const payload = {
      method: "wallet_adsClick",
      params: [taskId.toString()],
      id: 190252908,
      jsonrpc: "2.0",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data.result;
    } catch (error) {
      this.log(`Click quảng cáo lỗi: ${error.message}`, "error");
      return null;
    }
  }

  async claimAdsTask(taskId, axiosInstance) {
    const url = "https://miniapp.uxuy.one/rpc";
    const payload = {
      method: "wallet_adsClaim",
      params: [taskId.toString(), ""],
      id: 458008215,
      jsonrpc: "2.0",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data.result;
    } catch (error) {
      this.log(`Nhận thưởng lỗi: ${error.message}`, "error");
      return null;
    }
  }

  async manageAdsTask(axiosInstance) {
    const tasks = await this.getAdsTask(axiosInstance);

    for (const task of tasks) {
      if (task.finished) {
        const claim = await this.claimAdsTask(task.id, axiosInstance);
        if (claim) {
          this.log(
            colors.green(
              `Nhận thưởng thành công nhiệm vụ ${task.id}: ${claim.awardAmount} point`
            )
          );
        } else {
          this.log(colors.red("Nhận thưởng nhiệm vụ ${task.id} thất bại"));
        }
      } else if (task.clicked) {
        this.log(
          colors.yellow(
            `Đã click nhiệm vụ ${task.id} , vui lòng chờ hoàn thành...`
          )
        );
        continue;
      } else {
        const click = await this.clickAdsTask(task.id, axiosInstance);
        if (click) {
          this.log(colors.green(`Click thành công nhiệm vụ ${task.id}`));
          await this.countdown(10);
          const claim = await this.claimAdsTask(task.id, axiosInstance);
          if (claim) {
            this.log(
              colors.green(
                `Nhận thưởng thành công nhiệm vụ ${task.id}: ${claim.awardAmount} point`
              )
            );
          } else {
            this.log(colors.red("Nhận thưởng nhiệm vụ ${task.id} thất bại"));
          }
        } else {
          this.log(colors.red(`Click nhiệm vụ ${task.id} thất bại`));
        }
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

        await this.jwt(initData, axiosInstance);

        this.delContentType();
        this.setContentType("application/json");

        const info = await this.farmInfo(axiosInstance);
        if (info) {
          this.log(colors.green(`Balance: ${info.token.balance}`));

          if (info.sysTime < info.farmTime + info.coolDown) {
            this.log(
              colors.yellow(
                `Chưa đến thời gian nhận thưởng, chờ ${
                  info.farmTime + info.coolDown - info.sysTime
                } giây...`
              )
            );
          } else if (info.finished) {
            const params = [info.groupId, info.id, ""];
            const claim = await this.claimFarm(params, axiosInstance);
            if (claim) {
              this.log(
                colors.green(`Nhận thưởng thành công: ${claim.amount} point`)
              );
            } else {
              this.log(colors.red("Nhận thưởng thất bại"));
            }
          }
        }

        await this.manageAdsTask(axiosInstance);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      await this.countdown(3 * 60 * 60);
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