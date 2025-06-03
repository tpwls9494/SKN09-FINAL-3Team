document.addEventListener('DOMContentLoaded', () => {
  const buttons = document.querySelectorAll('.accordion-button');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const isExpanded = button.classList.toggle('expanded');
      const img = button.querySelector('img');

      img.src = isExpanded
        ? img.src.replace('more.png', 'small.png')
        : img.src.replace('small.png', 'more.png');
    });
  });
});
