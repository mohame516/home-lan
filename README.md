# LANDrive 📁

**LANDrive** is a local file-sharing platform inspired by Google Drive, designed to work entirely over a **LAN / local Wi-Fi network** without requiring an internet connection.

It allows multiple devices connected to the same network to access a shared web-based file explorer, upload and download files, manage folders, and communicate through a real-time LAN chat.

## ✨ Features

* 📁 Web-based File Explorer
* ⬆️ Upload files
* ⬇️ Download files
* 📂 Create folders
* ✏️ Rename files and folders
* 🗑️ Delete files and folders
* 🖱️ Drag & Drop file uploading
* 📊 File size display
* 💬 Real-time LAN Chat
* 👥 See users currently connected
* 📱 Works from computers, laptops, and phones
* 🌐 Works completely inside the local network
* 🚫 No internet connection required
* ⚡ Fast local file transfers
* 🔒 Files remain on your local network

## 🖥️ How it works

One computer runs the LANDrive server and stores the shared files.

Other devices connected to the same Wi-Fi or LAN can open the server from their browser.

For example:

```text
Server PC
192.168.1.20:3000
       │
       ├── 💻 Laptop
       ├── 📱 Phone
       ├── 💻 Desktop
       └── 💻 Another PC
