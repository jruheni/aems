export const customColors = {
  orange: '#ff8906',
  coral: '#f25f4c',
  pink: '#e53170',
};

export const getGradients = (opacity = '') => ({
  primary: `linear-gradient(135deg, ${customColors.coral}${opacity} 0%, ${customColors.pink}${opacity} 100%)`,
  secondary: `linear-gradient(135deg, ${customColors.orange}${opacity} 0%, ${customColors.coral}${opacity} 100%)`,
}); 