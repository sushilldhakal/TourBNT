# TourBNT.com - Quick Start Guide

## 🎯 Super Simple Deployment

### First Time (Run Once):

```bash
# 1. Copy script to server
scp setup-server-automated.sh root@134.199.164.139:~/

# 2. SSH and run it
ssh root@134.199.164.139
chmod +x setup-server-automated.sh
sudo ./setup-server-automated.sh

# 3. Set up SSL (after setup completes)
certbot --nginx -d tourbnt.com -d www.tourbnt.com
```

**Done!** Your app is live at https://tourbnt.com 🎉

---

### Every Update:

```bash
# From your local machine
./build-and-push.sh v1.0.X

# When asked "Deploy now?", type: y
```

**Done!** Your update is live! 🚀

---

## That's It!

- **First time**: Run `setup-server-automated.sh` on server
- **Updates**: Run `build-and-push.sh` on local machine

Simple as that! 😊
