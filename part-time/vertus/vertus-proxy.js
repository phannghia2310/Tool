const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");
const { HttpsProxyAgent } = require("https-proxy-agent");

class Vertus {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://thevertus.app",
      Referer: "https://thevertus.app/",
      "Sec-Ch-Ua":
        '"Not/A)Brand";v="99", "Google Chrome";v="115", "Chromium";v="115"',
      "Sec-Ch-Ua-Mobile": "?1",
      "Sec-Ch-Ua-Platform": '"Android"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
    };
    this.proxyList = [];
    this.loadProxies();
  }

  setAuthorization(auth) {
    this.headers["Authorization"] = `Bearer ${auth}`.replace(/[\r\n\t]/g, "");
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
      timeout: 50000,
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

  async getData(axiosInstance) {
    const url = "https://api.thevertus.app/users/get-data";

    try {
      const response = await axiosInstance.post(
        url,
        {},
        { headers: this.headers }
      );
      return response.data.user;
    } catch (eror) {
      return null;
    }
  }

  async collectStorage(axiosInstance) {
    const url = "https://api.thevertus.app/game-service/collect";

    try {
      const response = await axiosInstance.post(
        url,
        {},
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async dailyClaim(axiosInstance) {
    const url = "https://api.thevertus.app/users/claim-daily";

    try {
      const response = await axiosInstance.post(
        url,
        {},
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async upgradeBalance(type, axiosInstance) {
    const url = "https://api.thevertus.app/users/upgrade";
    const payload = {
      upgrade: type,
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageUpgrade(balance, upgrades, axiosInstance) {
    for (let [key, upgrade] of Object.entries(upgrades)) {
      if (balance < upgrade.priceToLevelUp) {
        this.log(colors.yellow(`Balance không đủ để nâng cấp ${key}`));
      } else {
        const upgradeResult = await this.upgradeBalance(key, axiosInstance);
        if (upgradeResult) {
          if (upgradeResult.success) {
            this.log(
              colors.green(`Nâng cấp ${key} lên level: ${upgrade.level + 1}`)
            );
          } else {
            this.log(
              colors.yellow(`${key} đã đạt cấp tối đa: ${upgrade.level}`)
            );
          }
        } else {
          this.log(colors.red(`Lỗi khi nâng cấp ${key}...`));
        }
      }
    }
  }

  async getUpgradeCards(axiosInstance) {
    const url = "https://api.thevertus.app/upgrade-cards";

    try {
      const response = await axiosInstance.get(url, { headers: this.headers });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async upgradeCard(cardId, axiosInstance) {
    const url = "https://api.thevertus.app/upgrade-cards/upgrade";
    const payload = { cardId: cardId };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers || {},
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageUpgradeCard(balance, axiosInstance) {
    const getAllCard = await this.getUpgradeCards(axiosInstance);
    let cards = [
      ...getAllCard.economyCards,
      ...getAllCard.militaryCards,
      ...getAllCard.scienceCards,
    ];

    cards.sort((a, b) => {
      const profitA = a.levels[0].cost / a.levels[0].value;
      const profitB = b.levels[0].cost / b.levels[0].value;
      return profitB - profitA;
    });

    for (let card of cards) {
      if (card.currentLevel + 1 == 10) {
        this.log(colors.cyan(`Card ${card.cardName} đã đạt cấp tối đa`));
      } else if (card.isLocked) {
        this.log(colors.yellow(`Card ${card.cardName} hiện tại đang bị khóa`));
      } else {
        if (balance < card.levels[card.currentLevel + 1].cost) {
          this.log(
            colors.yellow(`Balance không đủ để nâng cấp card ${card.cardName}`)
          );
        } else {
          const upgrade_card = await this.upgradeCard(card._id, axiosInstance);
          if (upgrade_card) {
            if (upgrade_card.isSuccess) {
              this.log(
                colors.green(`Nâng cấp card ${card.cardName} thành công`)
              );
              balance = upgrade_card.balance;
            } else {
              this.log(colors.red(`Nâng cấp card ${card.cardName} thất bại`));
            }
          } else {
            this.log(
              colors.red(`Lỗi trong quá trình nâng cấp card ${card.cardName}`)
            );
          }
        }
      }
    }
  }

  async getTask(axiosInstance) {
    const url = "https://api.thevertus.app/missions/get";
    const payload = {
      isPremium: false,
      languageCode: "vi",
    };

    try {
      const response = await axiosInstance.post(url, payload, {
        headers: this.headers,
      });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async claimTask(missionId, axiosInstance) {
    const url = "https://api.thevertus.app/missions/complete";

    try {
      const response = await axiosInstance.post(
        url,
        { missionId },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageTask(axiosInstance) {
    const getAllTask = await this.getTask(axiosInstance);

    const allTask = [
      ...getAllTask.community[0].flat(),
      ...getAllTask.groups.flatMap((group) => group.missions[0].flat()),
      ...getAllTask.newData[0].flatMap((data) => data.missions[0].flat()),
      ...getAllTask.newData[1].flatMap((data) => [
        ...data.missions.flat(),
        ...(data.missionsGroup ? data.missionsGroup.flat() : []),
      ]),
      ...getAllTask.newData[2].flatMap((data) => data.missions[0].flat()),
      ...getAllTask.sponsors.flat(),
      ...getAllTask.sponsors2.flat(),
    ];

    for (let task of allTask) {
      if (task.isCompleted) {
        continue;
      } else {
        this.log(colors.cyan(`Bắt đầu thực hiện nhiệm vụ ${task.title}...`));
        await this.countdown(5);
        const complete = await this.claimTask(task._id, axiosInstance);
        if (complete) {
          this.log(
            colors.green(
              `Hoàn thành nhiệm vụ ${task.title} | New balance: ${complete.newBalance}`
            )
          );
        } else {
          this.log(
            colors.red(
              `Không thể hoàn thành nhiệm vụ ${task.title} | Cần tự làm`
            )
          );
        }
      }
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
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    const nhiemvu = await this.askQuestion(
      "Bạn có muốn làm nhiệm vụ không? (y/n): "
    );
    const hoinhiemvu = nhiemvu.toLowerCase() === "y";

    const nangcap = await this.askQuestion(
      "Bạn có muốn nâng cấp không? (y/n): "
    );
    const hoinangcap = nangcap.toLowerCase() === "y";

    const nangcapcard = await this.askQuestion(
      "Bạn có muốn nâng cấp card không? (y/n): "
    );
    const hoinnangcapcard = nangcapcard.toLowerCase() === "y";

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userName = userData.username;
        this.setAuthorization(initData);

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
        const loginResult = await this.getData(axiosInstance);
        if (loginResult) {
          this.log(colors.green(`Balance: ${loginResult.balance}`));
          this.log(colors.green(`Storage mining: ${loginResult.vertStorage}`));

          const collectStorage = await this.collectStorage(axiosInstance);
          if (collectStorage) {
            this.log(
              colors.green(
                `Claim storage thành công | New balance: ${collectStorage.newBalance}`
              )
            );
          }

          const dailyClaim = await this.dailyClaim(axiosInstance);
          if (dailyClaim.success) {
            this.log(colors.green(`Điểm danh hằng ngày thành công`));
          } else {
            this.log(colors.yellow("Bạn đã điểm danh hôm nay rồi..."));
          }

          if (hoinangcap) {
            await this.manageUpgrade(
              loginResult.balance,
              loginResult.abilities,
              axiosInstance
            );
          }

          if (hoinhiemvu) {
            await this.manageTask(axiosInstance);
          }

          if (hoinnangcapcard) {
            await this.manageUpgradeCard(loginResult.balance, axiosInstance);
          }
        } else {
          this.log(colors.red("Có lỗi trong quá trình lấy thông tin user"));
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(24 * 60 * 60);
    }
  }
}

const client = new Vertus();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
