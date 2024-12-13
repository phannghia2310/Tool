const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const colors = require("colors");
const readline = require("readline");
const { DateTime } = require("luxon");

class TabiZoo {
  constructor() {
    this.headers = {
      Accept: "*/*",
      "Accept-Encoding": "gzip, deflate, br, zstd",
      "Accept-Language": "en-US,en;q=0.9,vi;q=0.8",
      "Content-Type": "application/json",
      Origin: "https://app.tabibot.com",
      Referer: "https://app.tabibot.com/",
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

  async signIn() {
    const url = "https://api.tabibot.com/api/user/v1/sign-in";
    const payload = {
      referral: 6823198302,
    };
    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi đăng nhập: ${error.message}`));
      return null;
    }
  }

  async profile() {
    const url = "https://api.tabibot.com/api/user/v1/profile";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy thông tin cá nhân: ${error.message}`));
      return null;
    }
  }

  async dailyCheckIn() {
    const url = "https://api.tabibot.com/api/user/v1/check-in";

    try {
      const response = await axios.post(url, null, { headers: this.headers });
      this.log(
        colors.green(
          `Check-in thành công: ${response.data.data.check_in_reward}`
        )
      );
    } catch (error) {
      this.log(colors.red(`Lỗi check-in: ${error.message}`));
    }
  }

  async claim() {
    const url = "https://api.tabibot.com/api/mining/v1/claim";

    try {
      const response = await axios.post(url, null, { headers: this.headers });
      this.log(
        colors.green(
          `Claim thành công ${response.data.data.zoo_coins} zoo coin`
        )
      );
    } catch (error) {
      this.log(colors.red(`Lỗi claim: ${error.message}`));
    }
  }

  async upgradeLevel() {
    const url = "https://api.tabibot.com/api/user/v1/level-up";

    try {
      const response = await axios.post(url, null, { headers: this.headers });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi nâng cấp level: ${error.message}`));
      return null;
    }
  }

  async playSpin() {
    const url = "https://api.tabibot.com/api/spin/v1/play";
    const payload = {
      multiplier: 2,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi quay spin: ${error.message}`));
      return null;
    }
  }

  async getTask() {
    const url = "https://api.tabibot.com/api/task/v1/list";
    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy danh sách nhiệm vụ: ${error.message}`));
      return null;
    }
  }

  async verifyTask(taskTag) {
    const url = "https://api.tabibot.com/api/task/v1/verify/task";
    const payload = {
      task_tag: taskTag,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi hoàn thành nhiệm vụ: ${error.message}`));
      return null;
    }
  }

  async manageTask() {
    const tasks = await this.getTask();
    const allTasks = tasks.slice(1).flatMap((item) => item.task_list);

    for (let task of allTasks) {
      if (task.user_task_status == 1) {
        continue;
      } else {
        const verify = await this.verifyTask(task.task_tag);
        if (verify) {
          this.log(
            colors.green(
              `Hoàn thành nhiệm vụ ${task.task_name} | Phần thưởng: ${verify.reward} coins`
            )
          );
        } else {
          this.log(
            colors.red(`Lỗi hoàn thành nhiệm vụ ${task.task_name} | Cần tự làm`)
          );
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }
  }

  async getMine() {
    const url = "https://api.tabibot.com/api/task/v1/project/mine";

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy thông tin mine: ${error.message}`));
      return null;
    }
  }

  async getMineTask(projectTag) {
    const url = `https://api.tabibot.com/api/task/v1/mine?project_tag=${projectTag}`;

    try {
      const response = await axios.get(url, { headers: this.headers });
      return response.data.data.list;
    } catch (error) {
      this.log(colors.red(`Lỗi lấy thông tin mine task: ${error.message}`));
      return null;
    }
  }

  async verifyProject(projectTag) {
    const url = "https://api.tabibot.com/api/task/v1/verify/project";
    const payload = {
      project_tag: projectTag,
    };

    try {
      const response = await axios.post(url, payload, {
        headers: this.headers,
      });
      return response.data.data;
    } catch (error) {
      this.log(colors.red(`Lỗi hoàn thành mine: ${error.message}`));
      return null;
    }
  }

  async manageMine() {
    const mine = await this.getMine();

    for (let project of mine) {
      if (project.user_project_status == 1) {
        continue;
      } else {
        const tasks = await this.getMineTask(project.project_tag);
        for (let task of tasks) {
          if (task.user_task_status == 1) {
            continue;
          } else {
            const verify = await this.verifyTask(task.task_tag);
            if (verify) {
              this.log(
                colors.green(
                  `Hoàn thành nhiệm vụ ${task.task_order}: ${task.task_name}`
                )
              );
            } else {
              this.log(
                colors.red(
                  `Lỗi hoàn thành nhiệm vụ ${task.task_order}: ${task.task_name} | Cần tự làm`
                )
              );
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 1500));
        const updatedTasks = await this.getMineTask(project.project_tag);

        const allTasksCompleted = updatedTasks.every(
          (task) => task.user_task_status === 1
        );

        if (allTasksCompleted) {
          const claim = await this.verifyProject(project.project_tag);

          if (claim) {
            this.log(
              colors.green(
                `Hoàn thành mine ${project.project_name} | Phần thưởng: ${claim.reward} coins`
              )
            );
          } else {
            this.log(
              colors.red(
                `Lỗi hoàn thành mine ${project.project_name} | Cần tự làm`
              )
            );
          }
        } else {
          this.log(
            colors.red(
              `Không thể claim mine ${project.project_name} vì chưa hoàn thành tất cả nhiệm vụ`
            )
          );
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
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

    const nangcap = await this.askQuestion(
      "Bạn có muốn nâng cấp không? (y/n): "
    );
    const hoinangcap = nangcap.toLowerCase() === "y";

    while (true) {
      for (let i = 0; i < data.length; i++) {
        const initData = data[i];
        const user = JSON.parse(
          decodeURIComponent(initData.split("user=")[1].split("&")[0])
        );
        const userName = user.username;
        this.headers["Rawdata"] = initData;

        console.log(
          `========== Tài khoản ${i + 1} | ${userName.green} ==========`
        );

        const result = await this.signIn(initData);

        if (result.is_login) {
          const profile = await this.profile();
          this.log(colors.green(`Coin: ${profile.user.coins}`));
          this.log(colors.green(`Zoo coin: ${profile.user.zoo_coins}`));
          this.log(colors.green(`Battery: ${profile.user.crystal_coins}`));
          this.log(colors.green(`Level: ${profile.user.level}`));
          this.log(colors.green(`Energy: ${profile.user.energy.energy}`));

          if (profile.user.check_in_date == "") {
            await this.dailyCheckIn();
          } else {
            this.log(colors.yellow("Đã check-in hôm nay"));
          }

          await this.claim();

          while (hoinangcap) {
            const upgrade = await this.upgradeLevel();
            if (upgrade) {
              this.log(
                colors.green(
                  `Nâng cấp level thành công: ${upgrade.user.level} | ${upgrade.user.secondary_level}`
                )
              );
              this.log(colors.cyan(`Coin còn lại: ${upgrade.user.coins}`));
            } else {
              this.log(colors.yellow("Không đủ coin để nâng cấp level"));
              break;
            }

            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          let energy = profile.user.energy.energy;
          if (energy == 0) {
            this.log(colors.yellow("Bạn đã hết lượt quay"));
          } else {
            while (energy > 0) {
              const spin = await this.playSpin();
              if (spin) {
                this.log(
                  colors.cyan(
                    `Phần thưởng: ${
                      spin.prize.amount * spin.prize.multiplier
                    } ${spin.prize.prize_type}`
                  )
                );
                this.log(
                  colors.yellow(`Energy còn lại: ${spin.energy.energy}`)
                );
              }

              energy = spin.energy.energy;
              await new Promise((resolve) => setTimeout(resolve, 2000));
            }
          }

          await this.manageTask();
          await this.manageMine();
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      await this.countdown(5 * 60 * 60);
    }
  }
}

const client = new TabiZoo();
client.main().catch((err) => {
  client.log(err.message, "error");
  process.exit(1);
});
