const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");

class Onus {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://onx.goonus.io",
      Referer: "https://onx.goonus.io/",
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

  async getMe(rawData) {
    const url = "https://bot-game.goonus.io/api/v1/me";
    const payload = { initData: rawData };
    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      }

      return {
        success: false,
        error: "Lỗi không thể lấy thông tin người dùng",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async claimClick(click, rawData) {
    const url = "https://bot-game.goonus.io/api/v1/claimClick";
    const payload = {
      click: click,
      initData: rawData,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      }

      return {
        success: false,
        error: "Lỗi không thể nhận click",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleClaimClick(point, rawData) {
    if (point === 0) {
      this.log("Đã claim hết điểm", "warning");
      return;
    }

    while (true) {
      let count = 0;
      const claim = await this.claimClick(point, rawData);

      if (!claim.success) {
        this.log(`Lỗi claim: ${claim.error}`, "error");
        return;
      }

      const { clickNumberLeft } = claim.data;
      if (clickNumberLeft === 0) {
        this.log("Đã claim hết điểm", "warning");
        return;
      }

      count++;
      this.log(`Đã click ${click} | Còn ${clickNumberLeft} click`, "success");
    }
  }

  async getAllTasks(rawData) {
    const url = "https://bot-game.goonus.io/api/v1/tasks";
    const payload = { initData: rawData };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data.tasks };
      }

      return {
        success: false,
        error: "Lỗi không thể lấy thông tin nhiệm vụ",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async checkTask(taskId, rawData) {
    const url = "https://bot-game.goonus.io/api/v1/checkTask";
    const payload = {
      taskId: taskId,
      initData: rawData,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.data.success === true) {
        return { success: true, data: response.data };
      }
      return {
        success: false,
        error: "Lỗi không thể kiểm tra nhiệm vụ",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleCheckTask(rawData) {
    const tasks = await this.getAllTasks(rawData);

    if (!tasks.success) {
      this.log(`Lỗi lấy ds nhiệm vụ: ${tasks.error}`, "error");
      return;
    }

    for (let task of tasks.data) {
      const taskId = task.id;
      if (taskId === 1731628877780) {
        continue;
      }
      if (!task.isChecked) {
        this.log(`Bắt đầu kiểm tra nhiệm vụ ${task.labelVi}`, "info");
        const check = await this.checkTask(taskId, rawData);

        if (!check.success) {
          this.log(`Lỗi check: ${check.error}`, "error");
          continue;
        }
      }
    }
  }

  async claimTask(taskId, rawData) {
    const url = "https://bot-game.goonus.io/api/v1/claimTask";
    const payload = {
      taskId: taskId,
      initData: rawData,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.status === 200) {
        return { success: true, data: response.data };
      }

      return {
        success: false,
        error: "Lỗi không thể nhận nhiệm vụ",
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleClaimTask(rawData) {
    const tasks = await this.getAllTasks(rawData);

    if (!tasks.success) {
      this.log(`Lỗi lấy ds nhiệm vụ: ${tasks.error}`, "error");
      return;
    }

    for (let task of tasks.data) {
      const taskId = task.id;
      if (taskId === 1731628877780) {
        continue;
      }
      if (task.isNotClaimed && task.isChecked) {
        this.log(`Bắt đầu nhận nhiệm vụ ${task.labelVi}`, "info");
        const current = Date.now();
        if (current < task.checkedTime + task.waitTime) {
            const remain = DateTime.fromMillis(
                task.checkedTime + task.waitTime - current
            ).toFormat("hh:mm:ss");
            this.log(`Chờ ${remain} để nhận nhiệm vụ`, "custom");
            continue;
        }

        const claim = await this.claimTask(taskId, rawData);

        if (!claim.success) {
          this.log(`Lỗi claim: ${claim.error}`, "error");
          continue;
        }

        this.log(`Đã nhận nhiệm vụ ${task.labelVi}`, "success");
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

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        const loginResult = await this.getMe(initData);

        if (loginResult.success) {
          const click = loginResult.data.clickNumberLeft;

          this.log(`========== Bắt đầu click ${click} ==========`, "success");
          await this.handleClaimClick(click, initData);
          this.log(`========== Bắt đầu kiểm tra nhiệm vụ ==========`, "success");
          await this.handleCheckTask(initData);
            this.log(`========== Bắt đầu nhận điểm nhiệm vụ ==========`, "success");
          await this.handleClaimTask(initData);
        } else {
          this.log(`Đăng nhập thất bại ${loginResult.error}`, "error");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(24 * 60 * 60);
    }
  }
}

const client = new Onus();
client.main().catch((err) => {
  client.log(err, "error");
  process.exit(1);
});
