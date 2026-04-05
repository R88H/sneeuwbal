const mortgages = [];

const mortgageForm = document.getElementById('mortgage-form');
const mortgageList = document.getElementById('mortgage-list');
const results = document.getElementById('results');
const calculateBtn = document.getElementById('calculate');

mortgageForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const name = document.getElementById('name').value.trim();
  const type = document.getElementById('type').value;
  const principal = Number(document.getElementById('principal').value);
  const rate = Number(document.getElementById('rate').value);
  const years = Number(document.getElementById('years').value);

  mortgages.push({
    id: crypto.randomUUID(),
    name,
    type,
    principal,
    annualRate: rate,
    totalMonths: years * 12,
  });

  mortgageForm.reset();
  renderMortgages();
  renderResultsMessage('Hypotheek toegevoegd. Klik op berekenen voor nieuwe resultaten.');
});

calculateBtn.addEventListener('click', () => {
  if (mortgages.length === 0) {
    renderResultsMessage('Voeg eerst minimaal één hypotheek toe.');
    return;
  }

  const extraMonthly = Number(document.getElementById('extra-monthly').value) || 0;

  const baseline = simulatePortfolio(mortgages, 0);
  const snowball = simulatePortfolio(mortgages, extraMonthly);

  const interestSaved = baseline.totalInterest - snowball.totalInterest;
  const monthsSaved = baseline.months - snowball.months;

  results.classList.remove('empty');
  results.innerHTML = `
    <div class="result-grid">
      <div class="result-box">
        <h3>Zonder sneeuwbal</h3>
        <div class="big">${baseline.months} maanden</div>
        <div class="small">Totale rente: ${euro(baseline.totalInterest)}</div>
      </div>
      <div class="result-box">
        <h3>Met sneeuwbal</h3>
        <div class="big">${snowball.months} maanden</div>
        <div class="small">Totale rente: ${euro(snowball.totalInterest)}</div>
      </div>
      <div class="result-box">
        <h3>Verschil</h3>
        <div class="big positive">${monthsSaved} maanden sneller</div>
        <div class="small positive">Rente bespaard: ${euro(interestSaved)}</div>
      </div>
    </div>
  `;
});

function simulatePortfolio(baseMortgages, extraMonthly) {
  const active = baseMortgages.map((mortgage) => {
    const monthlyRate = mortgage.annualRate / 100 / 12;
    return {
      ...mortgage,
      monthlyRate,
      remaining: mortgage.principal,
      monthlyPayment:
        mortgage.type === 'annuity'
          ? annuityPayment(mortgage.principal, monthlyRate, mortgage.totalMonths)
          : mortgage.principal / mortgage.totalMonths + mortgage.principal * monthlyRate,
      fixedPrincipal:
        mortgage.type === 'linear' ? mortgage.principal / mortgage.totalMonths : null,
    };
  });

  let month = 0;
  let totalInterest = 0;
  const safetyLimit = 1000 * 12;

  while (active.some((m) => m.remaining > 0.01) && month < safetyLimit) {
    month += 1;

    for (const mortgage of active) {
      if (mortgage.remaining <= 0.01) {
        continue;
      }

      const interest = mortgage.remaining * mortgage.monthlyRate;
      totalInterest += interest;

      let principalPayment;
      if (mortgage.type === 'annuity') {
        principalPayment = mortgage.monthlyPayment - interest;
      } else {
        principalPayment = mortgage.fixedPrincipal;
      }

      principalPayment = Math.min(principalPayment, mortgage.remaining);
      mortgage.remaining -= principalPayment;
    }

    if (extraMonthly > 0) {
      let budget = extraMonthly;
      while (budget > 0.01) {
        const target = active
          .filter((m) => m.remaining > 0.01)
          .sort((a, b) => a.remaining - b.remaining)[0];

        if (!target) {
          break;
        }

        const extraPay = Math.min(budget, target.remaining);
        target.remaining -= extraPay;
        budget -= extraPay;
      }
    }
  }

  return {
    months: month,
    totalInterest,
  };
}

function annuityPayment(principal, monthlyRate, months) {
  if (monthlyRate === 0) {
    return principal / months;
  }
  const factor = (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
  return principal * factor;
}

function euro(amount) {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 2,
  }).format(amount);
}

function renderMortgages() {
  if (mortgages.length === 0) {
    mortgageList.className = 'list empty';
    mortgageList.textContent = 'Nog geen hypotheken toegevoegd.';
    return;
  }

  mortgageList.className = 'list';
  mortgageList.innerHTML = '';

  for (const mortgage of mortgages) {
    const row = document.createElement('div');
    row.className = 'item';

    const info = document.createElement('div');
    info.innerHTML = `
      <strong>${mortgage.name}</strong><br>
      ${mortgage.type === 'annuity' ? 'Annuïteit' : 'Lineair'} · ${euro(mortgage.principal)} · ${mortgage.annualRate}% · ${mortgage.totalMonths / 12} jaar
    `;

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Verwijder';
    remove.addEventListener('click', () => {
      const index = mortgages.findIndex((m) => m.id === mortgage.id);
      if (index >= 0) {
        mortgages.splice(index, 1);
      }
      renderMortgages();
      renderResultsMessage('Hypotheek verwijderd. Herbereken voor actuele resultaten.');
    });

    row.append(info, remove);
    mortgageList.appendChild(row);
  }
}

function renderResultsMessage(message) {
  results.className = 'results empty';
  results.textContent = message;
}
