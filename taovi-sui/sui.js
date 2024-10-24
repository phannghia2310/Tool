import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { fromB64 } from '@mysten/bcs';
import fs from 'fs';

const CONFIG = {
    numberOfWallets: 10,
    outputFile: 'sui_wallets.json',
    addressFile: 'address_sui.txt'
};

async function generateWallets() {
    try {
        const wallets = [];
        let addressesText = '';
        
        for (let i = 0; i < CONFIG.numberOfWallets; i++) {
            const keypair = new Ed25519Keypair();
            
            const wallet = {
                address: keypair.getPublicKey().toSuiAddress(),
                publicKey: keypair.getPublicKey().toBase64(),
                privateKey: keypair.export().privateKey,
                index: i + 1
            };
            
            // Thêm địa chỉ vào chuỗi văn bản
            addressesText += `${wallet.address}\n`;
            
            wallets.push(wallet);
            
            console.log(`Tạo ví ${i + 1}/${CONFIG.numberOfWallets}`);
        }
        
        // Lưu thông tin đầy đủ vào file JSON
        fs.writeFileSync(
            CONFIG.outputFile,
            JSON.stringify(wallets, null, 2)
        );
        
        // Lưu danh sách địa chỉ vào file text
        fs.writeFileSync(CONFIG.addressFile, addressesText.trim());
        
        console.log(`\nTạo thành công ${CONFIG.numberOfWallets} ví`);
        console.log(`Lưu thông tin đầy đủ vào: ${CONFIG.outputFile}`);
        console.log(`Lưu danh sách địa chỉ vào: ${CONFIG.addressFile}`);
        
        return wallets;
    } catch (error) {
        console.error('Lỗi tạo ví:', error);
        throw error;
    }
}

generateWallets();