import { createSignal, createComb, createEffect, batch, createScope, circuit } from '../runtime/index.js';

export const __graph = {
  "nodes": [
    {
      "id": "username",
      "name": "username",
      "type": "signal"
    },
    {
      "id": "email",
      "name": "email",
      "type": "signal"
    },
    {
      "id": "password",
      "name": "password",
      "type": "signal"
    },
    {
      "id": "confirm",
      "name": "confirm",
      "type": "signal"
    },
    {
      "id": "usernameValid",
      "name": "usernameValid",
      "type": "comb"
    },
    {
      "id": "emailValid",
      "name": "emailValid",
      "type": "comb"
    },
    {
      "id": "passwordLength",
      "name": "passwordLength",
      "type": "comb"
    },
    {
      "id": "requiredStrength",
      "name": "requiredStrength",
      "type": "comb"
    },
    {
      "id": "passwordStrong",
      "name": "passwordStrong",
      "type": "comb"
    },
    {
      "id": "passwordsMatch",
      "name": "passwordsMatch",
      "type": "comb"
    },
    {
      "id": "canSubmit",
      "name": "canSubmit",
      "type": "comb"
    },
    {
      "id": "strengthLabel",
      "name": "strengthLabel",
      "type": "comb"
    },
    {
      "id": "submitLabel",
      "name": "submitLabel",
      "type": "comb"
    },
    {
      "id": "event:submit",
      "name": "submit",
      "type": "event"
    },
    {
      "id": "view",
      "name": "view",
      "type": "view-binding"
    }
  ],
  "edges": [
    {
      "from": "username",
      "to": "usernameValid",
      "type": "data"
    },
    {
      "from": "email",
      "to": "emailValid",
      "type": "data"
    },
    {
      "from": "password",
      "to": "passwordLength",
      "type": "data"
    },
    {
      "from": "username",
      "to": "requiredStrength",
      "type": "data"
    },
    {
      "from": "passwordLength",
      "to": "passwordStrong",
      "type": "data"
    },
    {
      "from": "requiredStrength",
      "to": "passwordStrong",
      "type": "data"
    },
    {
      "from": "password",
      "to": "passwordsMatch",
      "type": "data"
    },
    {
      "from": "confirm",
      "to": "passwordsMatch",
      "type": "data"
    },
    {
      "from": "usernameValid",
      "to": "canSubmit",
      "type": "data"
    },
    {
      "from": "emailValid",
      "to": "canSubmit",
      "type": "data"
    },
    {
      "from": "passwordStrong",
      "to": "canSubmit",
      "type": "data"
    },
    {
      "from": "passwordsMatch",
      "to": "canSubmit",
      "type": "data"
    },
    {
      "from": "passwordLength",
      "to": "strengthLabel",
      "type": "data"
    },
    {
      "from": "canSubmit",
      "to": "submitLabel",
      "type": "data"
    },
    {
      "from": "username",
      "to": "view",
      "type": "data"
    },
    {
      "from": "usernameValid",
      "to": "view",
      "type": "data"
    },
    {
      "from": "email",
      "to": "view",
      "type": "data"
    },
    {
      "from": "emailValid",
      "to": "view",
      "type": "data"
    },
    {
      "from": "requiredStrength",
      "to": "view",
      "type": "data"
    },
    {
      "from": "password",
      "to": "view",
      "type": "data"
    },
    {
      "from": "passwordStrong",
      "to": "view",
      "type": "data"
    },
    {
      "from": "strengthLabel",
      "to": "view",
      "type": "data"
    },
    {
      "from": "confirm",
      "to": "view",
      "type": "data"
    },
    {
      "from": "passwordsMatch",
      "to": "view",
      "type": "data"
    },
    {
      "from": "submitLabel",
      "to": "view",
      "type": "data"
    }
  ]
};

export function RegistrationForm(root) {
  const $m = 'RegistrationForm';
  circuit.loadStaticGraph(__graph);
  const __scope = createScope();

  const [username, setUsername] = createSignal("", { name: 'username', module: $m, type: 'string' });

  const [email, setEmail] = createSignal("", { name: 'email', module: $m, type: 'string' });

  const [password, setPassword] = createSignal("", { name: 'password', module: $m, type: 'string' });

  const [confirm, setConfirm] = createSignal("", { name: 'confirm', module: $m, type: 'string' });

  const usernameValid = createComb(() => (username().length >= 3), { name: 'usernameValid', module: $m, deps: ["username"] });

  const emailValid = createComb(() => (email().includes("@") && email().includes(".")), { name: 'emailValid', module: $m, deps: ["email"] });

  const passwordLength = createComb(() => password().length, { name: 'passwordLength', module: $m, deps: ["password"] });

  const requiredStrength = createComb(() => ((username().length < 5) ? 8 : 6), { name: 'requiredStrength', module: $m, deps: ["username"] });

  const passwordStrong = createComb(() => (passwordLength() >= requiredStrength()), { name: 'passwordStrong', module: $m, deps: ["passwordLength","requiredStrength"] });

  const passwordsMatch = createComb(() => ((password() == confirm()) && (confirm().length > 0)), { name: 'passwordsMatch', module: $m, deps: ["password","confirm"] });

  const canSubmit = createComb(() => (((usernameValid() && emailValid()) && passwordStrong()) && passwordsMatch()), { name: 'canSubmit', module: $m, deps: ["usernameValid","emailValid","passwordStrong","passwordsMatch"] });

  const strengthLabel = createComb(() => ((passwordLength() < 4) ? "weak" : ((passwordLength() < 7) ? "medium" : "strong")), { name: 'strengthLabel', module: $m, deps: ["passwordLength"] });

  const submitLabel = createComb(() => (canSubmit() ? "Create Account" : "Fill all fields"), { name: 'submitLabel', module: $m, deps: ["canSubmit"] });

  function submit() {
    batch(() => {
    });
  }

  const el0 = document.createElement('form');
  el0.setAttribute('class', 'reg-form');
  const el1 = document.createElement('h2');
  const txt0 = document.createTextNode('Create Account');
  el1.appendChild(txt0);
  el0.appendChild(el1);
  const el2 = document.createElement('div');
  el2.setAttribute('class', 'field');
  const el3 = document.createElement('label');
  const txt1 = document.createTextNode('Username');
  el3.appendChild(txt1);
  el2.appendChild(el3);
  const el4 = document.createElement('input');
  el4.value = username();
  createEffect(() => { el4.value = username(); }, { name: 'bind:username', module: $m });
  el4.addEventListener('input', (e) => { setUsername(e.target.value); });
  el4.setAttribute('placeholder', '3+ characters');
  el2.appendChild(el4);
  const el5 = document.createElement('span');
  createEffect(() => { el5.setAttribute('class', (usernameValid() ? "valid" : "invalid")); }, { name: 'attr:class', module: $m });
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String((usernameValid() ? "ok" : "too short")); }, { name: 'view:txt2', module: $m });
  el5.appendChild(txt2);
  el2.appendChild(el5);
  el0.appendChild(el2);
  const el6 = document.createElement('div');
  el6.setAttribute('class', 'field');
  const el7 = document.createElement('label');
  const txt3 = document.createTextNode('Email');
  el7.appendChild(txt3);
  el6.appendChild(el7);
  const el8 = document.createElement('input');
  el8.value = email();
  createEffect(() => { el8.value = email(); }, { name: 'bind:email', module: $m });
  el8.addEventListener('input', (e) => { setEmail(e.target.value); });
  el8.setAttribute('placeholder', 'you@example.com');
  el6.appendChild(el8);
  const el9 = document.createElement('span');
  createEffect(() => { el9.setAttribute('class', (emailValid() ? "valid" : "invalid")); }, { name: 'attr:class', module: $m });
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String((emailValid() ? "ok" : "needs @ and .")); }, { name: 'view:txt4', module: $m });
  el9.appendChild(txt4);
  el6.appendChild(el9);
  el0.appendChild(el6);
  const el10 = document.createElement('div');
  el10.setAttribute('class', 'field');
  const el11 = document.createElement('label');
  const txt5 = document.createTextNode('Password (min');
  el11.appendChild(txt5);
  el10.appendChild(el11);
  const el12 = document.createElement('span');
  const txt6 = document.createTextNode('');
  createEffect(() => { txt6.data = String(requiredStrength()); }, { name: 'view:txt6', module: $m });
  el12.appendChild(txt6);
  el10.appendChild(el12);
  const el13 = document.createElement('label');
  const txt7 = document.createTextNode('chars)');
  el13.appendChild(txt7);
  el10.appendChild(el13);
  const el14 = document.createElement('input');
  el14.value = password();
  createEffect(() => { el14.value = password(); }, { name: 'bind:password', module: $m });
  el14.addEventListener('input', (e) => { setPassword(e.target.value); });
  el10.appendChild(el14);
  const el15 = document.createElement('span');
  createEffect(() => { el15.setAttribute('class', (passwordStrong() ? "valid" : "invalid")); }, { name: 'attr:class', module: $m });
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String(strengthLabel()); }, { name: 'view:txt8', module: $m });
  el15.appendChild(txt8);
  el10.appendChild(el15);
  el0.appendChild(el10);
  const el16 = document.createElement('div');
  el16.setAttribute('class', 'field');
  const el17 = document.createElement('label');
  const txt9 = document.createTextNode('Confirm Password');
  el17.appendChild(txt9);
  el16.appendChild(el17);
  const el18 = document.createElement('input');
  el18.value = confirm();
  createEffect(() => { el18.value = confirm(); }, { name: 'bind:confirm', module: $m });
  el18.addEventListener('input', (e) => { setConfirm(e.target.value); });
  el16.appendChild(el18);
  const el19 = document.createElement('span');
  createEffect(() => { el19.setAttribute('class', (passwordsMatch() ? "valid" : "invalid")); }, { name: 'attr:class', module: $m });
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String((passwordsMatch() ? "match" : "no match")); }, { name: 'view:txt10', module: $m });
  el19.appendChild(txt10);
  el16.appendChild(el19);
  el0.appendChild(el16);
  const el20 = document.createElement('button');
  el20.addEventListener('click', submit);
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(submitLabel()); }, { name: 'view:txt11', module: $m });
  el20.appendChild(txt11);
  el0.appendChild(el20);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}