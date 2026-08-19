// Method page visual overrides.
// Keeps secondary client factors clearly distinct from the mint inactive slices.

const style = document.createElement("style");
style.id = "method-theme-overrides";
style.textContent = `
  #content .methodWheelSlice.is-client:not(.is-selected) {
    fill: #5F9F9E !important;
  }
`;
document.head.appendChild(style);
