const fs = require("fs");
const path = require("path");
const axios = require("axios");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");

class Fambam {
  constructor() {
    this.headers = {
      Accept: "*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language":
        "vi-VN,vi;q=0.9,fr-FR;q=0.8,fr;q=0.7,en-US;q=0.6,en;q=0.5",
      "Content-Type": "application/json",
      Origin: "https://tma.bit.country",
      Referer: "https://tma.bit.country/",
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

  async loginWithTelegramMiniApp(userId, firstName, lastName, userName) {
    const url =
      "https://pioneer-api.bit.country/authentication/loginWithTelegramMiniApp";
    const payload = {
      SocialUserId: userId,
      SocialUsername: userName,
      SocialDisplayName: `${lastName} ${firstName}`,
      SocialLoginType: "telegram_mini_app",
      _t: 1731584831749,
      _nonce: "78975232",
    };

    try {
      const response = await axios.post(url, payload, {
        headers: {
          ...this.headers,
        },
      });

      if (response.status == 200) {
        const { token } = response.data.token;
        return {
          success: true,
          data: { token },
        };
      } else {
        return { success: false, error: "Login failed" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getMe(metaverseId, token) {
    const url = `https://pioneer-quest-api.mnet.io/v1/user-connection/me?${metaverseId}&&isMiniApp=true`;
    try {
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status == 200) {
        const { totalPointsCollected, totalPointBurnt } = response.data.data;

        this.log(`Your seeds: ${totalPointsCollected}`);
        this.log(`Total burnt: ${totalPointBurnt}`);
      } else {
        return { success: false, error: "Failed to get me ifo" };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async claimPoint(metaverseId, token) {
    const url =
      "https://pioneer-quest-api.mnet.io/v1/user-daily-reward/claim-points";
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };
    const payload = {
      metaverseId: metaverseId,
      version: 2,
      _t: 1731590182548,
      _nonce: "83702358",
    };

    try {
      const response = await axios.post(url, payload, { headers });

      if (response.status == 201) {
        return {
          success: true,
          data: response.data.data,
        };
      }

      return { success: false, error: "Failed to claim point" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleClaimPoint(metaverseId, token) {
    try {
      const claim = await this.claimPoint(metaverseId, token);

      if (!claim.success) {
        this.log(`Không thể claim: ${claim.error}`, "error");
      }

      const { claimedPoints } = claim.data;
      this.log(`Claim successfully: ${claimedPoints}`);
    } catch (error) {
      this.log(`Claim error: ${error.message}`);
    } finally {
      return true;
    }
  }

  async openBox(metaverseId, token, numBox) {
    const url =
      "https://pioneer-quest-api.mnet.io/v1/user-daily-reward/minigame/claim-point";
    const payload = {
      metaverseId: metaverseId,
      numBoxes: numBox,
      _t: 1731592322785,
      _nonce: "96104532",
    };
    const headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };

    try {
      const response = await axios.post(url, payload, { headers });

      if (response.status == 201) {
        const { pointClaim, pointBurnt } = response.data.data;

        return {
          success: true,
          data: { pointClaim, pointBurnt },
        };
      }
      return { success: false, error: "Failed to open box" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async getBoxInfo(metaverseId, token) {
    const url = `https://pioneer-quest-api.mnet.io/v1/user-daily-reward/minigame/next-claimed?metaverseId=${metaverseId}`;

    try {
      const response = await axios.get(url, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status == 200) {
        return { success: true, data: response.data.data };
      }

      return { success: false, error: "Failed to get box info" };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async handleOpenBox(metaverseId, token) {
    try {
      const boxInfo = await this.getBoxInfo(metaverseId, token);

      if (!boxInfo.success) {
        this.log(boxInfo.error, "error");
      }

      const { numBlindBox } = boxInfo.data;

      this.log(`Tổng box: ${numBlindBox}`);

      if (numBlindBox <= 0) {
        this.log("You are not have any box, please wait!");
      } else {
        const open = await this.openBox(metaverseId, token, numBlindBox);
        const data = open.data;

        this.log(`Claim point: ${data.pointClaim}`, "success");
        this.log(`Burnt point: ${data.pointBurnt}`, "success");
      }
    } catch (error) {
      this.log(`Error: ${error.message}`);
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

  async main() {
    const dataFile = path.join(__dirname, "data.txt");
    const data = fs
      .readFileSync(dataFile, "utf8")
      .replace(/\r/g, "")
      .split("\n")
      .filter(Boolean);

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const [metaverseId, initData] = data[i].split("|");
        const userData = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userId = userData.id;
        const firstName = userData.first_name;
        const lastName = userData.last_name;
        const userName = userData.username;

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        const loginResult = await this.loginWithTelegramMiniApp(
          userId,
          firstName,
          lastName,
          userName
        );

        if (loginResult.success) {
          const { token } = loginResult.data;

          this.log(`Đăng nhập thành công!`, "success");

          await this.getMe(metaverseId, token);
          await this.handleClaimPoint(metaverseId, token);
          await this.handleOpenBox(metaverseId, token);

          // Đếm ngược 60 giây giữa các tài khoản
          this.log(`Đã chạy xong tài khoản ${i + 1}`);
        } else {
          this.log(`Đăng nhập thất bại: ${loginResult.error}`, "error");
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(40 * 60);
    }
  }
}

const client = new Fambam();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
