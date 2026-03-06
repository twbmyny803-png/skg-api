const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors());
app.use(express.json());

// قاعدة بيانات تجريبية داخل الذاكرة
let users = [];
let depositRequests = [];
let withdrawRequests = [];

let nextUserId = 1;
let nextDepositId = 1;
let nextWithdrawId = 1;

// الصفحة الرئيسية
app.get("/", (req, res) => {
  res.json({
    ok: true,
    message: "SKG API demo running ✅"
  });
});

// تسجيل حساب تجريبي
app.post("/register", async (req, res) => {
  try {
    const { fullName, email, password } = req.body || {};

    if (!fullName || !email || !password) {
      return res.status(400).json({
        ok: false,
        error: "fullName, email, password required"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = users.find((u) => u.email === normalizedEmail);
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        error: "email already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      id: nextUserId++,
      fullName: String(fullName).trim(),
      email: normalizedEmail,
      passwordHash,
      demoBalance: 2500,
      status: "active",
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    return res.json({
      ok: true,
      message: "account created ✅",
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        email: newUser.email,
        demoBalance: newUser.demoBalance,
        status: newUser.status,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// تسجيل دخول تجريبي
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        error: "email and password required"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = users.find((u) => u.email === normalizedEmail);

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "user not found"
      });
    }

    const matched = await bcrypt.compare(password, user.passwordHash);

    if (!matched) {
      return res.status(401).json({
        ok: false,
        error: "invalid password"
      });
    }

    return res.json({
      ok: true,
      message: "login success ✅",
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        demoBalance: user.demoBalance,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: error.message
    });
  }
});

// كل المستخدمين - أدمن تجريبي
app.get("/admin/users", (req, res) => {
  const safeUsers = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    demoBalance: u.demoBalance,
    status: u.status,
    createdAt: u.createdAt
  }));

  res.json({
    ok: true,
    users: safeUsers
  });
});

// تفاصيل مستخدم
app.get("/admin/users/:id", (req, res) => {
  const id = Number(req.params.id);
  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  return res.json({
    ok: true,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      demoBalance: user.demoBalance,
      status: user.status,
      createdAt: user.createdAt
    }
  });
});

// تعديل حالة مستخدم
app.put("/admin/users/:id/status", (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body || {};

  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  if (!status) {
    return res.status(400).json({
      ok: false,
      error: "status required"
    });
  }

  user.status = String(status);

  return res.json({
    ok: true,
    message: "status updated ✅",
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      demoBalance: user.demoBalance,
      status: user.status
    }
  });
});

// تعديل الرصيد التجريبي
app.put("/admin/users/:id/balance", (req, res) => {
  const id = Number(req.params.id);
  const { amount } = req.body || {};

  const user = users.find((u) => u.id === id);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  if (typeof amount !== "number") {
    return res.status(400).json({
      ok: false,
      error: "amount must be number"
    });
  }

  user.demoBalance += amount;

  return res.json({
    ok: true,
    message: "balance updated ✅",
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      demoBalance: user.demoBalance,
      status: user.status
    }
  });
});

// طلب إيداع تجريبي
app.post("/deposit-request", (req, res) => {
  const { email, amount } = req.body || {};

  if (!email || typeof amount !== "number") {
    return res.status(400).json({
      ok: false,
      error: "email and numeric amount required"
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  const request = {
    id: nextDepositId++,
    userId: user.id,
    email: user.email,
    amount,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  depositRequests.push(request);

  return res.json({
    ok: true,
    message: "deposit request created ✅",
    request
  });
});

// طلب سحب تجريبي
app.post("/withdraw-request", (req, res) => {
  const { email, amount } = req.body || {};

  if (!email || typeof amount !== "number") {
    return res.status(400).json({
      ok: false,
      error: "email and numeric amount required"
    });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = users.find((u) => u.email === normalizedEmail);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  const request = {
    id: nextWithdrawId++,
    userId: user.id,
    email: user.email,
    amount,
    status: "pending",
    createdAt: new Date().toISOString()
  };

  withdrawRequests.push(request);

  return res.json({
    ok: true,
    message: "withdraw request created ✅",
    request
  });
});

// عرض طلبات الإيداع
app.get("/admin/deposits", (req, res) => {
  return res.json({
    ok: true,
    deposits: depositRequests
  });
});

// عرض طلبات السحب
app.get("/admin/withdraws", (req, res) => {
  return res.json({
    ok: true,
    withdraws: withdrawRequests
  });
});

// قبول إيداع تجريبي
app.put("/admin/deposits/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const request = depositRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "deposit request not found"
    });
  }

  const user = users.find((u) => u.id === request.userId);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      ok: false,
      error: "request already processed"
    });
  }

  request.status = "approved";
  user.demoBalance += request.amount;

  return res.json({
    ok: true,
    message: "deposit approved ✅",
    request,
    user: {
      id: user.id,
      email: user.email,
      demoBalance: user.demoBalance
    }
  });
});

// رفض إيداع تجريبي
app.put("/admin/deposits/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const request = depositRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "deposit request not found"
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      ok: false,
      error: "request already processed"
    });
  }

  request.status = "rejected";

  return res.json({
    ok: true,
    message: "deposit rejected ✅",
    request
  });
});

// قبول سحب تجريبي
app.put("/admin/withdraws/:id/approve", (req, res) => {
  const id = Number(req.params.id);
  const request = withdrawRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "withdraw request not found"
    });
  }

  const user = users.find((u) => u.id === request.userId);

  if (!user) {
    return res.status(404).json({
      ok: false,
      error: "user not found"
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      ok: false,
      error: "request already processed"
    });
  }

  if (user.demoBalance < request.amount) {
    return res.status(400).json({
      ok: false,
      error: "insufficient demo balance"
    });
  }

  request.status = "approved";
  user.demoBalance -= request.amount;

  return res.json({
    ok: true,
    message: "withdraw approved ✅",
    request,
    user: {
      id: user.id,
      email: user.email,
      demoBalance: user.demoBalance
    }
  });
});

// رفض سحب تجريبي
app.put("/admin/withdraws/:id/reject", (req, res) => {
  const id = Number(req.params.id);
  const request = withdrawRequests.find((r) => r.id === id);

  if (!request) {
    return res.status(404).json({
      ok: false,
      error: "withdraw request not found"
    });
  }

  if (request.status !== "pending") {
    return res.status(400).json({
      ok: false,
      error: "request already processed"
    });
  }

  request.status = "rejected";

  return res.json({
    ok: true,
    message: "withdraw rejected ✅",
    request
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`SKG API running on port ${PORT}`);
});
