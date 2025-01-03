const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");

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

  async getData() {
    const url = "https://api.thevertus.app/users/get-data";

    try {
      const response = await axios.post(url, {}, { headers: this.headers });
      return response.data.user;
    } catch (eror) {
      return null;
    }
  }

  async collectStorage() {
    const url = "https://api.thevertus.app/game-service/collect";

    try {
      const response = await axios.post(url, {}, { headers: this.headers });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async dailyClaim() {
    const url = "https://api.thevertus.app/users/claim-daily";

    try {
      const response = await axios.post(url, {}, { headers: this.headers });
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async getTask() {
    const url = "https://api.thevertus.app/missions/get";
    const payload = {
      isPremium: false,
      languageCode: "vi",
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

  async claimTask(missionId) {
    const url = "https://api.thevertus.app/missions/complete";

    try {
      const response = await axios.post(
        url,
        { missionId },
        { headers: this.headers }
      );
      return response.data;
    } catch (error) {
      return null;
    }
  }

  async manageTask() {
    const getAllTask = await this.getTask();

    const allTask = [
      ...getAllTask.community[0].flat(),
      ...getAllTask.groups.flatMap((group) => group.missions[0].flat()),
      ...getAllTask.newData[0].flatMap(data => data.missions[0].flat()),
      ...getAllTask.newData[1].flatMap(data => [...data.missions.flat(), ...(data.missionsGroup ? data.missionsGroup.flat() : [])]),
      ...getAllTask.newData[2].flatMap(data => data.missions[0].flat()),
      ...getAllTask.sponsors.flat(),
      ...getAllTask.sponsors2.flat(),
    ];

    for (let task of allTask) {
      if (task.isCompleted) {
        continue;
      } else {
        this.log(colors.cyan(`Bắt đầu thực hiện nhiệm vụ ${task.title}...`));
        await this.countdown(5);
        const complete = await this.claimTask(task._id);
        if (complete) {
          this.log(colors.green(`Hoàn thành nhiệm vụ ${task.title} | New balance: ${complete.newBalance}`));
        } else {
          this.log(colors.red(`Không thể hoàn thành nhiệm vụ ${task.title} | Cần tự làm`));
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

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userName = userData.username;
        this.setAuthorization(initData);

        const nhiemvu = await this.askQuestion(
          "Bạn có muốn làm nhiệm vụ không? (y/n): "
        );
        const hoinhiemvu = nhiemvu.toLowerCase() === "y";

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        const loginResult = await this.getData();
        if (loginResult) {
          this.log(colors.green(`Balance: ${loginResult.balance}`));
          this.log(colors.green(`Storage mining: ${loginResult.vertStorage}`));

          const collectStorage = await this.collectStorage();
          if (collectStorage) {
            this.log(
              colors.green(
                `Claim storage thành công | New balance: ${collectStorage.newBalance}`
              )
            );
          }

          const dailyClaim = await this.dailyClaim();
          if (dailyClaim.success) {
            this.log(colors.green(`Điểm danh hằng ngày thành công`));
          } else {
            this.log(colors.yellow('Bạn đã điểm danh hôm nay rồi...'));
          }

          if (hoinhiemvu) {
            await this.manageTask();
          }
        } else {
          this.log(colors.red("Có lỗi trong quá trình lấy thông tin user"));
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(8 * 60 * 60);
    }
  }
}

const client = new Vertus();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
