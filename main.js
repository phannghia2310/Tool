const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

// Đường dẫn đến thư mục gốc
const BASE_DIR = "C:/Users/phank/Downloads/Telegram Desktop/Tool/Tool"; // Thay bằng đường dẫn thật

// Đường dẫn đến file danh sách
const FILE_LIST = path.join(BASE_DIR, "list_file.txt");

// Kiểm tra xem file danh sách có tồn tại không
if (!fs.existsSync(FILE_LIST)) {
  console.error(`File list not found: ${FILE_LIST}`);
  process.exit(1);
}

// Đọc danh sách file từ list_file.txt
const lines = fs
  .readFileSync(FILE_LIST, "utf8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line);

lines.forEach((line) => {
  const jsFilePath = path.join(BASE_DIR, line.trim()); // Đường dẫn đầy đủ
  const jsFileName = path.basename(jsFilePath); // Tên file
  const jsDir = path.dirname(jsFilePath); // Thư mục chứa file

  console.log(`Checking file: ${jsFilePath}`);

  // Kiểm tra nếu file `.js` tồn tại
  if (fs.existsSync(jsFilePath) && path.extname(jsFilePath) === ".js") {
    console.log(`File exists: ${jsFilePath}`);

    // Kiểm tra sự tồn tại của proxy.txt và data.txt
    const proxyPath = path.join(jsDir, "proxy.txt");
    const dataPath = path.join(jsDir, "data.txt");

    if (!fs.existsSync(proxyPath)) {
      console.warn(`Missing proxy.txt in ${jsDir}. Skipping "${jsFilePath}".`);
      return;
    }

    if (!fs.existsSync(dataPath)) {
      console.warn(`Missing data.txt in ${jsDir}. Skipping "${jsFilePath}".`);
      return;
    }

    console.log(
      `Running JavaScript file: "${jsFileName}" in directory: "${jsDir}"`
    );
    
    const terminal = spawn(
      "cmd.exe",
      ["/c", `start cmd.exe /k "cd /d "${jsDir}" && node "${jsFileName}""`],
      {
        stdio: "inherit", // Hiển thị đầu ra
        shell: true, // Chạy với shell
      }
    );

    terminal.on("error", (error) => {
      console.error(`Error running ${jsFilePath}:`, error.message);
    });

    terminal.on("exit", (code) => {
      if (code === 0) {
        console.log(`Successfully executed ${jsFilePath}`);
      } else {
        console.error(`Failed to execute ${jsFilePath} with exit code ${code}`);
      }
    });
  } else {
    console.warn(
      `Invalid or missing JavaScript file: "${jsFilePath}". Skipping...`
    );
  }
});

console.log("All scripts started. Check VS Code terminal for outputs.");
