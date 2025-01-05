const fs = require('fs');
const path = require('path');

// Hàm chuyển đổi nội dung từ file txt sang JSON
function convertTxtToJson(inputFile, outputFile) {
    // Đọc file txt
    fs.readFile(inputFile, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi đọc file:', err);
            return;
        }

        // Xử lý nội dung file
        const lines = data.split('\n').filter(line => line.trim() !== '');
        const jsonArray = [];
        let updatedLines = [];

        lines.forEach(line => {
            const [title, code] = line.split(':').map(part => part.trim());
            
            // Kiểm tra xem title đã tồn tại trong mảng jsonArray chưa
            const titleExists = jsonArray.some(item => item.title === title);
            
            if (!titleExists) {
                jsonArray.push({ title, code });
                updatedLines.push(line); // Lưu lại dòng hợp lệ
            }
        });

        // Ghi dữ liệu JSON vào file
        fs.writeFile(outputFile, JSON.stringify(jsonArray, null, 2), 'utf8', err => {
            if (err) {
                console.error('Lỗi ghi file JSON:', err);
            } else {
                console.log(`Đã ghi dữ liệu JSON vào file: ${outputFile}`);
                
                // Cập nhật file input với các dòng không bị loại bỏ
                fs.writeFile(inputFile, updatedLines.join('\n'), 'utf8', err => {
                    if (err) {
                        console.error('Lỗi ghi file input:', err);
                    } else {
                        console.log(`Đã cập nhật file input: ${inputFile}`);
                    }
                });
            }
        });
    });
}

// Đường dẫn file đầu vào và đầu ra
const inputFilePath = path.join(__dirname, 'input.txt'); // Đường dẫn tới file txt đầu vào
const outputFilePath = path.join(__dirname, 'answer.json'); // Đường dẫn tới file json đầu ra

// Gọi hàm để chuyển đổi
convertTxtToJson(inputFilePath, outputFilePath);
