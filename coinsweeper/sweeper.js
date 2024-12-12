const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const colors = require("colors");
const readline = require("readline");
const moment = require("moment");
const { DateTime } = require("luxon");

class BybitSpaces {
  constructor() {
    this.headers = {
      Accept: "application/json, text/plain, */*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "vi,fr-FR;q=0.9,fr;q=0.8,en-US;q=0.7,en;q=0.6",
      "Content-Type": "application/json",
      Origin: "https://bybitcoinsweeper.com",
      Referer: "https://bybitcoinsweeper.com/",
      "Sec-Ch-Ua":
        '"Microsoft Edge";v="131", "Chromium";v="131", "Not_A Brand";v="24", "Microsoft Edge WebView2";v="131"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-site",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0",
    };
  }

  setAuthorization(auth) {
    this.headers["Authorization"] = `Bearer ${auth}`;
  }

  delAuthorization() {
    delete this.headers["Authorization"];
  }

  setTlInitData(data) {
    this.headers["Tl-Init-Data"] = data;
  }

  delTlInitData() {
    delete this.headers["Tl-Init-Data"];
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

  async getOrRefreshToken(id, data) {
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
      token = await this.login(data);
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

  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  value(i) {
    return [...i].reduce((sum, char) => sum + char.charCodeAt(0), 0) / 1e5;
  }

  calc(i, s, a, o, d, g) {
    const st =
      ((10 * i + Math.max(0, 1200 - 10 * s) + 2000) * (1 + o / a)) / 10;
    return Math.floor(st) + this.value(g);
  }

  async login(initData) {
    const url = "https://api.bybitcoinsweeper.com/api/auth/login";
    const payload = {
      initData: initData,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.accessToken;
    } catch (error) {
      this.log(`Lỗi đăng nhập: ${error.message}`, "error");
    }
  }

  async me() {
    const url = "https://api.bybitcoinsweeper.com/api/users/me";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data;
    } catch (error) {
      this.log(colors.red(`Lỗi khi lấy thông tin user: ${error.message}`));
      return null;
    }
  }

  async start() {
    const url = "https://api.bybitcoinsweeper.com/api/games/start";

    try {
      const response = await axios.post(url, null, { headers: this.headers });
      return response.data;
    } catch (error) {
      this.log(colors.red(`Lỗi khi bắt đầu game: ${error.message}`));
      return null;
    }
  }

  async lose(payload) {
    const url = "https://api.bybitcoinsweeper.com/api/games/lose";

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });

      if (response.status == 201) {
        this.log(colors.red("Bạn thua, chờ một chút để bắt đầu game mới..."));
      }
    } catch (error) {
      this.log(colors.red(`Lỗi khi hoàn thành game: ${error.message}`));
    }
  }

  async win(payload) {
    const url = "https://api.bybitcoinsweeper.com/api/games/win";

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      if (response.status == 201) {
        this.log(
          colors.green(
            `Điểm: ${payload.score} | Bạn thắng, chờ một chút để bắt đầu game mới...`
          )
        );
      }
    } catch (error) {
      this.log(colors.red(`Lỗi khi hoàn thành game: ${error.message}`));
    }
  }

  async managePlayGame(id) {
    const startGame = await this.start();
    const gameCountdown = this.getRandomInt(90, 150);

    if (startGame) {
      this.log(colors.green(`Bắt đầu chơi game....`));
      const startAt = startGame.createdAt;
      const gameId = startGame.id;
      const bits = startGame.rewards.bits;
      const gifts = startGame.rewards.gifts;
      const bagCoins = startGame.rewards.bagCoins;

      const winornot = Math.random() > 0.5 ? false : true;
      if (!winornot) {
        const payload = {
          gameId: gameId,
          bits: bits,
          bagCoins: bagCoins,
          gifts: gifts,
        };

        await this.countdown(gameCountdown);
        await this.lose(payload);
        await this.me();
      } else {
        const unixTimeStarted = new Date(startAt);
        const unixTimeMs = unixTimeStarted.getTime();
        const timePlay = gameCountdown;
        const userId = id + "v$2f1";
        const mr_pl = `${gameId}-${unixTimeMs}`;
        const lr_pl = this.calc(45, timePlay, 54, 9, true, gameId);
        const xr_pl = `${userId}-${mr_pl}`;
        const kr_pl = `${timePlay}-${gameId}`;
        const _r = crypto
          .createHmac("sha256", xr_pl)
          .update(kr_pl)
          .digest("hex");

        const payload = {
          bagCoins: bagCoins,
          bits: bits,
          gameId: gameId,
          gameTime: timePlay,
          gifts: gifts,
          h: _r,
          score: lr_pl,
        };

        await this.countdown(gameCountdown);
        await this.win(payload);
        await this.me();
      }
    } else {
      this.log(colors.red(`Không thể bắt đầu game....`));
    }

    await this.countdown(5);
  }

  async processAccount(data, index) {
    if (!data || data.trim() === "") {
      return null;
    }

    try {
      this.setTlInitData(data);
      const user = JSON.parse(
        decodeURIComponent(data.split("user=")[1].split("&")[0])
      );
      const id = user.id;
      const username = user.username;

      console.log(
        `========== Tài khoản ${index + 1} | ${username.green} ==========`
      );

      const token = await this.getOrRefreshToken(id, data);
      if (!token) return null;
      this.setAuthorization(token);

      const getMe = await this.me();
      this.log(colors.green(`Balance: ${getMe.score.overall}`));
      while (true) {
        await this.managePlayGame(id);
      }
    } catch (error) {
      console.error(
        colors.red(`Lỗi xử lý tài khoản ${index + 1}: ${error.message}`)
      );
      return null;
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
      const listCountdown = [];

      for (let i = 0; i < data.length; i++) {
        try {
          const result = await this.processAccount(data[i], i);
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

      await this.countdown(30 * 60);
    }
  }
}

const client = new BybitSpaces();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
