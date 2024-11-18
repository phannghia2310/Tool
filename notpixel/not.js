const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");

class NotPixel {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://app.notpx.app",
      Referer: "https://app.notpx.app/",
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
    const url = "https://notpx.app/api/v1/users/me";
    const headers = {
      ...this.headers,
      Authorization: `initData ${rawData}`,
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.status == 200) {
        return { success: true, data: response.data };
      }
      return { success: false, error: "Không thể lấy thông tin người dùng" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getStatus(rawData) {
    const url = "https://notpx.app/api/v1/mining/status";
    const headers = {
      ...this.headers,
      Authorization: `initData ${rawData}`,
    };

    try {
      const response = await axios.get(url, { headers });
      if (response.status == 200) {
        return { success: true, data: response.data };
      }
      return { success: false, error: "Không thể lấy trạng thái tài khoản" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async startPain(rawData, charges) {
    if (charges == 0) {
      this.log(`Bạn đã hết điểm tô màu!`);
      return;
    }

    let pixelIds = [];

    for (let y = 374; y < 394; y++) {
      for (let x = 823 + 1; x < 853; x++) {
        const pixelId = parseInt(`${y}${x}`);
        pixelIds.push(pixelId);
      }
    }

    for (let i = 0; i < charges; i++) {
      const url = "https://notpx.app/api/v1/repaint/start";
      const payload = {
        pixelId: pixelIds[i],
        newColor: "#51E9F4",
      };
      const headers = {
        ...this.headers,
        Authorization: `initData ${rawData}`,
      };

      try {
        const response = await axios.post(url, payload, { headers });
        if (response.status == 200) {
          this.log(
            `Tô màu thành công lần ${i + 1} | Balance mới: ${
              response.data.balance
            }`,
            "success"
          );
        }
      } catch (error) {
        this.log(`Lỗi tô màu: ${error.message}`);
      }
    }
  }

  async getClaim(rawData) {
    const url = "https://notpx.app/api/v1/mining/claim";
    const headers = {
      ...this.headers,
      Authorization: `initData ${rawData}`,
    };

    try {
      const response = axios.get(url, { headers });

      if (response.status == 200) {
        this.log(`Claim thành công: ${response.data.claimed}`, "success");
      } else {
        this.log(`Bạn đã claim rồi, vui lòng chờ 3560 giây`);
      }
    } catch (error) {
      this.log(`Lỗi claim: ${error.message}`);
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
          this.log("Đăng nhập thành công!", "success");
          this.log(
            `User: ${loginResult.data.firstName} ${loginResult.data.lastName}`
          );

          const status = await this.getStatus(initData);
          if (status.success) {
            this.log(`Balance: ${status.data.userBalance}`);

            await this.getClaim(initData);
            await this.startPain(initData, status.data.charges);
          } else {
            this.log(`Không thể lấy trạng thái: ${status.error}`, "error");
          }
        } else {
          this.log(`Đăng nhập thất bại: ${loginResult.error}`, "error");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(60);
    }
  }
}

const client = new NotPixel();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
