import { createSignal, createComb, createEffect, batch, createScope, circuit, X } from '../runtime/index.js';

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
      "id": "assert:0",
      "name": "assert:0",
      "type": "assert"
    },
    {
      "id": "assert:1",
      "name": "assert:1",
      "type": "assert"
    },
    {
      "id": "event:submit",
      "name": "submit",
      "type": "event"
    },
    {
      "id": "view:bind:username",
      "name": "view:bind:username",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:usernameValid",
      "name": "view:usernameValid",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:email",
      "name": "view:bind:email",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:emailValid",
      "name": "view:emailValid",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:requiredStrength",
      "name": "view:requiredStrength",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:password",
      "name": "view:bind:password",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:strengthLabel",
      "name": "view:strengthLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:bind:confirm",
      "name": "view:bind:confirm",
      "type": "view-effect",
      "viewTarget": {
        "element": "input",
        "binding": "bind:bind"
      }
    },
    {
      "id": "view:attr:class",
      "name": "view:attr:class",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "attr:class"
      }
    },
    {
      "id": "view:passwordsMatch",
      "name": "view:passwordsMatch",
      "type": "view-effect",
      "viewTarget": {
        "element": "span",
        "binding": "text"
      }
    },
    {
      "id": "view:attr:disabled",
      "name": "view:attr:disabled",
      "type": "view-effect",
      "viewTarget": {
        "element": "button",
        "binding": "attr:disabled"
      }
    },
    {
      "id": "view:submitLabel",
      "name": "view:submitLabel",
      "type": "view-effect",
      "viewTarget": {
        "element": "button",
        "binding": "text"
      }
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
      "to": "assert:0",
      "type": "data"
    },
    {
      "from": "canSubmit",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "usernameValid",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "emailValid",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "passwordStrong",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "passwordsMatch",
      "to": "assert:1",
      "type": "data"
    },
    {
      "from": "username",
      "to": "view:bind:username",
      "type": "data"
    },
    {
      "from": "usernameValid",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "usernameValid",
      "to": "view:usernameValid",
      "type": "data"
    },
    {
      "from": "email",
      "to": "view:bind:email",
      "type": "data"
    },
    {
      "from": "emailValid",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "emailValid",
      "to": "view:emailValid",
      "type": "data"
    },
    {
      "from": "requiredStrength",
      "to": "view:requiredStrength",
      "type": "data"
    },
    {
      "from": "password",
      "to": "view:bind:password",
      "type": "data"
    },
    {
      "from": "passwordStrong",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "strengthLabel",
      "to": "view:strengthLabel",
      "type": "data"
    },
    {
      "from": "confirm",
      "to": "view:bind:confirm",
      "type": "data"
    },
    {
      "from": "passwordsMatch",
      "to": "view:attr:class",
      "type": "data"
    },
    {
      "from": "passwordsMatch",
      "to": "view:passwordsMatch",
      "type": "data"
    },
    {
      "from": "canSubmit",
      "to": "view:attr:disabled",
      "type": "data"
    },
    {
      "from": "submitLabel",
      "to": "view:submitLabel",
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

  createEffect(() => {
    const __ok = (username().length >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(username.length >= 0)',
        module: $m,
        values: { username: username() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (canSubmit() == (((usernameValid() && emailValid()) && passwordStrong()) && passwordsMatch()));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(canSubmit == (((usernameValid && emailValid) && passwordStrong) && passwordsMatch))',
        module: $m,
        values: { canSubmit: canSubmit(), usernameValid: usernameValid(), emailValid: emailValid(), passwordStrong: passwordStrong(), passwordsMatch: passwordsMatch() },
      });
    }
  }, { name: 'assert:1', module: $m });

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
  createEffect(() => { el4.value = username(); }, { name: 'view:bind:username', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el4.addEventListener('input', (e) => { setUsername(e.target.value); });
  el4.setAttribute('placeholder', '3+ characters');
  el2.appendChild(el4);
  const el5 = document.createElement('span');
  createEffect(() => { el5.setAttribute('class', (usernameValid() ? "valid" : "invalid")); }, { name: 'view:attr:usernameValid', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt2 = document.createTextNode('');
  createEffect(() => { txt2.data = String((usernameValid() ? "ok" : "too short")); }, { name: 'view:usernameValid', module: $m, viewTarget: { element: 'span', binding: 'text' } });
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
  createEffect(() => { el8.value = email(); }, { name: 'view:bind:email', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el8.addEventListener('input', (e) => { setEmail(e.target.value); });
  el8.setAttribute('placeholder', 'you@example.com');
  el6.appendChild(el8);
  const el9 = document.createElement('span');
  createEffect(() => { el9.setAttribute('class', (emailValid() ? "valid" : "invalid")); }, { name: 'view:attr:emailValid', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt4 = document.createTextNode('');
  createEffect(() => { txt4.data = String((emailValid() ? "ok" : "needs @ and .")); }, { name: 'view:emailValid', module: $m, viewTarget: { element: 'span', binding: 'text' } });
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
  createEffect(() => { txt6.data = String(requiredStrength()); }, { name: 'view:requiredStrength', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el12.appendChild(txt6);
  el10.appendChild(el12);
  const el13 = document.createElement('label');
  const txt7 = document.createTextNode('chars)');
  el13.appendChild(txt7);
  el10.appendChild(el13);
  const el14 = document.createElement('input');
  el14.value = password();
  createEffect(() => { el14.value = password(); }, { name: 'view:bind:password', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el14.addEventListener('input', (e) => { setPassword(e.target.value); });
  el10.appendChild(el14);
  const el15 = document.createElement('span');
  createEffect(() => { el15.setAttribute('class', (passwordStrong() ? "valid" : "invalid")); }, { name: 'view:attr:passwordStrong', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt8 = document.createTextNode('');
  createEffect(() => { txt8.data = String(strengthLabel()); }, { name: 'view:strengthLabel', module: $m, viewTarget: { element: 'span', binding: 'text' } });
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
  createEffect(() => { el18.value = confirm(); }, { name: 'view:bind:confirm', module: $m, viewTarget: { element: 'input', binding: 'bind:value' } });
  el18.addEventListener('input', (e) => { setConfirm(e.target.value); });
  el16.appendChild(el18);
  const el19 = document.createElement('span');
  createEffect(() => { el19.setAttribute('class', (passwordsMatch() ? "valid" : "invalid")); }, { name: 'view:attr:passwordsMatch', module: $m, viewTarget: { element: 'span', binding: 'attr:class' } });
  const txt10 = document.createTextNode('');
  createEffect(() => { txt10.data = String((passwordsMatch() ? "match" : "no match")); }, { name: 'view:passwordsMatch', module: $m, viewTarget: { element: 'span', binding: 'text' } });
  el19.appendChild(txt10);
  el16.appendChild(el19);
  el0.appendChild(el16);
  const el20 = document.createElement('button');
  el20.addEventListener('click', submit);
  createEffect(() => { const __v = !canSubmit(); if (__v) el20.setAttribute('disabled', ''); else el20.removeAttribute('disabled'); }, { name: 'view:attr:canSubmit', module: $m, viewTarget: { element: 'button', binding: 'attr:disabled' } });
  const txt11 = document.createTextNode('');
  createEffect(() => { txt11.data = String(submitLabel()); }, { name: 'view:submitLabel', module: $m, viewTarget: { element: 'button', binding: 'text' } });
  el20.appendChild(txt11);
  el0.appendChild(el20);
  root.appendChild(el0);

  return { dispose: __scope.dispose };
}

export function __test() {
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

  createEffect(() => {
    const __ok = (username().length >= 0);
    if (!__ok) {
      circuit.assertionFailed('assert:0', {
        expr: '(username.length >= 0)',
        module: $m,
        values: { username: username() },
      });
    }
  }, { name: 'assert:0', module: $m });

  createEffect(() => {
    const __ok = (canSubmit() == (((usernameValid() && emailValid()) && passwordStrong()) && passwordsMatch()));
    if (!__ok) {
      circuit.assertionFailed('assert:1', {
        expr: '(canSubmit == (((usernameValid && emailValid) && passwordStrong) && passwordsMatch))',
        module: $m,
        values: { canSubmit: canSubmit(), usernameValid: usernameValid(), emailValid: emailValid(), passwordStrong: passwordStrong(), passwordsMatch: passwordsMatch() },
      });
    }
  }, { name: 'assert:1', module: $m });

  return {
    signals: { username: { get: username, set: setUsername }, email: { get: email, set: setEmail }, password: { get: password, set: setPassword }, confirm: { get: confirm, set: setConfirm } },
    combs: { usernameValid, emailValid, passwordLength, requiredStrength, passwordStrong, passwordsMatch, canSubmit, strengthLabel, submitLabel },
    dispose: __scope.dispose,
  };
}