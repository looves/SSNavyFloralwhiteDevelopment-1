// utils/getImageExtension.js

/**
 * Función para obtener la extensión de una imagen a partir de su URL.
 * @param {string} url - URL de la imagen.
 * @returns {string} - Extensión de la imagen, por defecto .jpg si no se encuentra.
 */
function getImageExtension(url) {
    // Utiliza una expresión regular para buscar extensiones comunes de imágenes
    const match = url.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i);
    return match ? match[0] : '.png'; // Devuelve .jpg por defecto si no se encuentra una extensión
}

module.exports = getImageExtension;
