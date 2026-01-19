function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function load(key, defaultValue) {
  const raw = localStorage.getItem(key);
  if (raw === null) return defaultValue;
  return JSON.parse(raw);
}

/* =========================
   Inicialización
========================= */
function initData() {
  if (load("balance", null) === null) save("balance", 0);
  if (load("transactions", null) === null) save("transactions", []);

  if (load("contacts", null) === null) {
    save("contacts", [
      { name: "Mamá", account: "111-1" },
      { name: "Hermano", account: "222-2" },
      { name: "Amigo", account: "333-3" }
    ]);
  }

  if (load("session", null) === null) save("session", null);
}

/* =========================
   Seguridad simple
========================= */
function requireSession() {
  const session = load("session", null);
  if (!session) window.location.href = "login.html";
}

/* =========================
   Helpers
========================= */
function money(n) {
  return "$" + Number(n).toLocaleString("es-CL");
}

function showMsg(selector, type, text) {
  const $el = $(selector);
  $el.stop(true, true);
  $el
    .removeClass("d-none alert-success alert-danger alert-info")
    .addClass("alert alert-" + type)
    .hide()
    .text(text)
    .fadeIn(200)
    .delay(1500)
    .fadeOut(300);
}

/* =========================
   Movimientos
========================= */
function addTransaction(type, amount, detail) {
  const transactions = load("transactions", []);
  transactions.unshift({
    type,
    amount: Number(amount),
    detail,
    date: new Date().toLocaleString("es-CL")
  });
  save("transactions", transactions);
}

function renderBalance() {
  $("#balanceText").text(money(load("balance", 0)));
}

function renderTransactions(limit) {
  const transactions = load("transactions", []);
  const $list = $("#txList");
  $list.empty();

  if (transactions.length === 0) {
    $list.append(`<li class="list-group-item">No hay movimientos.</li>`);
    return;
  }

  const max = limit ? Math.min(limit, transactions.length) : transactions.length;

  for (let i = 0; i < max; i++) {
    const t = transactions[i];
    const label = t.type === "deposit" ? "Depósito" : "Envío";
    const badge = t.type === "deposit" ? "bg-success" : "bg-danger";

    $list.append(`
      <li class="list-group-item d-flex justify-content-between">
        <div>
          <strong>${label}</strong> - ${t.detail}
          <br><small class="text-muted">${t.date}</small>
        </div>
        <span class="badge ${badge} rounded-pill">${money(t.amount)}</span>
      </li>
    `);
  }
}

/* =========================
   Contactos
========================= */
function renderContactsSelect() {
  const contacts = load("contacts", []);
  const $select = $("#contactSelect");
  if (!$select.length) return;

  $select.empty().append(`<option value="">Selecciona un contacto</option>`);

  contacts.forEach(c => {
    $select.append(`<option value="${c.account}">${c.name} (${c.account})</option>`);
  });
}

function addContact(name, account) {
  const contacts = load("contacts", []);
  if (contacts.some(c => c.account === account)) return false;

  contacts.push({ name, account });
  save("contacts", contacts);
  return true;
}

/* =========================
   Autocomplete
========================= */
function renderSuggestions(query) {
  const contacts = load("contacts", []);
  const $box = $("#suggestions");
  $box.empty();

  if (!query) {
    $box.hide();
    return;
  }

  const matches = contacts.filter(c =>
    (c.name + c.account).toLowerCase().includes(query.toLowerCase())
  );

  if (!matches.length) {
    $box.append(`<li class="list-group-item text-muted">Sin resultados</li>`).show();
    return;
  }

  matches.forEach(c => {
    $box.append(`
      <li class="list-group-item suggestion-item" data-account="${c.account}">
        <strong>${c.name}</strong> (${c.account})
      </li>
    `);
  });

  $box.show();
}

/* =========================
   DOM READY
========================= */
$(document).ready(function () {
  initData();

  /* ---------- LOGIN ---------- */
  if ($("#loginForm").length) {
    if (load("session", null)) window.location.href = "menu.html";

    $("#loginForm").on("submit", function (e) {
      e.preventDefault();

      const email = $("#email").val().trim();
      const pass = $("#password").val().trim();

      if (email === "user@alke.cl" && pass === "1234") {
        save("session", { email });
        window.location.href = "menu.html";
      } else {
        $("#loginMsg").removeClass("d-none").text("Credenciales incorrectas.");
      }
    });
  }

  /* ---------- MENÚ ---------- */
  if ($("#menuPage").length) {
    requireSession();
    renderBalance();
    renderTransactions(5);

    $("#logoutBtn").on("click", function () {
      save("session", null);
      window.location.href = "login.html";
    });

    $("#toggleTx").on("click", function () {
      $("#txPanel").slideToggle(200);
    });
  }

  /* ---------- DEPÓSITO ---------- */
  if ($("#depositPage").length) {
    requireSession();
    renderBalance();

    $("#depositForm").on("submit", function (e) {
      e.preventDefault();

      const amount = Number($("#depositAmount").val());
      if (!amount || amount <= 0) {
        showMsg("#depositMsg", "danger", "Monto inválido");
        return;
      }

      save("balance", load("balance", 0) + amount);
      addTransaction("deposit", amount, "Ingreso a saldo");
      renderBalance();
      $("#depositAmount").val("");
      showMsg("#depositMsg", "success", "Depósito realizado");
    });
  }

  /* ---------- ENVIAR DINERO ---------- */
  if ($("#sendPage").length) {
    requireSession();
    renderBalance();
    renderContactsSelect();

    $("#toggleAddContact").on("click", function () {
      $("#addContactBox").toggleClass("d-none").hide().slideDown(200);
    });

    $("#addContactForm").on("submit", function (e) {
      e.preventDefault();

      const name = $("#newContactName").val().trim();
      const account = $("#newContactAccount").val().trim();

      if (!name || !account) {
        showMsg("#sendMsg", "danger", "Completa todos los campos");
        return;
      }

      if (!addContact(name, account)) {
        showMsg("#sendMsg", "danger", "La cuenta ya existe");
        return;
      }

      renderContactsSelect();
      this.reset();
      showMsg("#sendMsg", "success", "Contacto agregado");
    });

    $("#contactSearch").on("keyup", function () {
      renderSuggestions($(this).val());
    });

    $(document).on("click", ".suggestion-item", function () {
      $("#contactSelect").val($(this).data("account"));
      $("#contactSearch").val($(this).text());
      $("#suggestions").hide();
    });

    $("#sendForm").on("submit", function (e) {
      e.preventDefault();

      const account = $("#contactSelect").val();
      const amount = Number($("#sendAmount").val());
      const balance = load("balance", 0);

      if (!account || !amount || amount <= 0) {
        showMsg("#sendMsg", "danger", "Datos inválidos");
        return;
      }

      if (amount > balance) {
        showMsg("#sendMsg", "danger", "Saldo insuficiente");
        return;
      }

      save("balance", balance - amount);
      addTransaction("send", amount, "Transferencia a " + account);
      renderBalance();
      $("#sendAmount").val("");
      showMsg("#sendMsg", "success", "Transferencia exitosa");
    });
  }

  /* ---------- MOVIMIENTOS ---------- */
  if ($("#txPage").length) {
    requireSession();
    renderBalance();
    renderTransactions();
  }
});