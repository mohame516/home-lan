# Home LAN 📁

**Home LAN** is a local file-sharing platform inspired by Google Drive, designed to work entirely over a **LAN / local Wi-Fi network** without requiring an internet connection.

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

One computer runs the Home LAN server and stores the shared files.

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
```

Simply open:

```text
http://SERVER-IP:3000
```

from another device on the same network.

## 🛠️ Technologies

* Node.js
* Express
* Socket.IO
* Multer
* HTML
* CSS
* JavaScript

## 📥 Download

You can download the ready-to-run ZIP version here:

[**home-lan-project-mohamed57.zip**](https://github.com/mohamedwaleed57/home-lan/releases/download/download/home-lan-project-mohamed57.zip)

## 🚀 Installation

Make sure **Node.js** is installed.

Clone the repository:

```bash
git clone YOUR_REPOSITORY_LINK
cd home-lan
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

The terminal will show something similar to:

```text
Home LAN running on:
http://localhost:3000

LAN address:
http://192.168.1.20:3000
```

Open the LAN address from another device connected to the same network.

## 📂 Storage

Uploaded files are stored locally inside:

```text
storage/
```

For example:

```text
storage/
├── Unity/
├── Projects/
├── Videos/
├── Games/
└── Documents/
```

The files are **not uploaded to an external cloud service**.

## 💬 LAN Chat

Home LAN also includes a real-time chat system using Socket.IO.

Users connected to the same LAN can communicate without using an external messaging service.

## 🔐 Privacy

Home LAN is designed for private local networks.

Your files stay on the computer running the Home LAN server and are transferred directly through the local network.

**Do not expose the Home LAN server directly to the public internet.**

For the best experience, use it on a trusted private Wi-Fi or LAN network.

## 🧪 Project Status

Home LAN is currently an early version / MVP.

More features can be added in the future, such as:

* User accounts
* Password protection
* File sharing permissions
* Direct device-to-device transfers
* QR code connection
* Transfer speed and progress improvements
* File previews
* Search
* Notifications
* Admin dashboard
* Better mobile interface

## 📄 License

This project is open source. See the repository license for details.
