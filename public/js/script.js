document.addEventListener('DOMContentLoaded', function () {
  // Upload form
  const uploadForm = document.getElementById('uploadForm');
  const fileInput = document.getElementById('certificateFile');
  const uploadArea = document.querySelector('.upload-area');
  const fileInfo = document.querySelector('.file-info');
  const fileNameEl = document.getElementById('fileName');
  const fileTypeEl = document.getElementById('fileType');
  const fileSizeEl = document.getElementById('fileSize');
  const passwordField = document.querySelector('.password-field');
  const passwordInput = document.getElementById('certificatePassword');
  const uploadButton = document.getElementById('uploadButton');
  const uploadSpinner = document.querySelector('.upload-spinner');
  const uploadMessage = document.querySelector('.upload-message');

  // Format bytes to human-readable size
  function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Handle file selection
  if (fileInput) {
    fileInput.addEventListener('change', function (e) {
      handleFileSelect(e);
    });
  }

  function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;

    // Show file information
    fileInfo.style.display = 'block';
    fileNameEl.textContent = file.name;
    fileTypeEl.textContent = file.type || 'Unknown';
    fileSizeEl.textContent = formatFileSize(file.size);

    // Check if this is a p12/pfx file (may require password)
    const fileExt = file.name.split('.').pop().toLowerCase();
    if (fileExt === 'p12' || fileExt === 'pfx') {
      passwordField.classList.add('required-password');
      // Make password optional by not setting required attribute
      passwordInput.required = false;
    } else {
      passwordField.classList.remove('required-password');
      passwordInput.required = false;
    }

    // Clear any previous messages
    uploadMessage.className = 'upload-message';
    uploadMessage.style.display = 'none';
    uploadMessage.textContent = '';
  }

  // Handle form submission
  if (uploadForm) {
    uploadForm.addEventListener('submit', function (e) {
      // Show spinner
      if (uploadButton) {
        uploadButton.disabled = true;
        uploadSpinner.style.display = 'inline-block';
      }

      // Handle password verification for p12/pfx files
      const file = fileInput.files[0];
      if (file) {
        const fileExt = file.name.split('.').pop().toLowerCase();
        // Only verify password if it's a p12/pfx AND a password was provided
        if (fileExt === 'p12' || fileExt === 'pfx') {
          e.preventDefault();

          // Create form data
          const formData = new FormData();
          formData.append('certificate', file);
          formData.append('password', passwordInput.value);

          // Verify password first
          fetch('/api/certificates/verify-password', {
            method: 'POST',
            body: formData,
          })
            .then((response) => response.json())
            .then((data) => {
              if (data.success && data.isValid) {
                // Password is valid, submit the form
                uploadForm.submit();
              } else {
                // Show error message
                uploadMessage.className = 'upload-message error';
                uploadMessage.textContent = 'Invalid password for certificate';
                uploadMessage.style.display = 'block';

                // Reset button
                uploadButton.disabled = false;
                uploadSpinner.style.display = 'none';
              }
            })
            .catch((error) => {
              // Show error message
              uploadMessage.className = 'upload-message error';
              uploadMessage.textContent = 'Error verifying password: ' + error.message;
              uploadMessage.style.display = 'block';

              // Reset button
              uploadButton.disabled = false;
              uploadSpinner.style.display = 'none';
            });
        }
      }
    });
  }

  // Handle drag and drop
  if (uploadArea) {
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => {
      uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach((eventName) => {
      uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach((eventName) => {
      uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
      uploadArea.classList.add('highlight');
    }

    function unhighlight() {
      uploadArea.classList.remove('highlight');
    }

    uploadArea.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files.length > 0) {
        fileInput.files = files;

        // Trigger change event manually
        const event = new Event('change');
        fileInput.dispatchEvent(event);
      }
    }
  }

  // Certificate deletion
  const deleteButtons = document.querySelectorAll('.delete-certificate');
  deleteButtons.forEach((button) => {
    button.addEventListener('click', function (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent the card click event from firing

      if (confirm('Are you sure you want to delete this certificate?')) {
        const certificateId = this.getAttribute('data-id');

        fetch(`/api/certificates/${certificateId}`, {
          method: 'DELETE',
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              // Remove the certificate card
              const certificateCard = this.closest('.certificate-card').parentElement;
              certificateCard.remove();
            } else {
              alert('Failed to delete certificate');
            }
          })
          .catch((error) => {
            console.error('Error deleting certificate:', error);
            alert('An error occurred while deleting the certificate');
          });
      }
    });
  });

  // Certificate cards click to view details
  const certificateCards = document.querySelectorAll('.certificate-clickable');
  const certificateDetailsModal = new bootstrap.Modal(document.getElementById('certificateDetailsModal'));

  certificateCards.forEach((card) => {
    card.addEventListener('click', function () {
      // Get certificate ID from the card
      const id = this.getAttribute('data-certificate-id');

      // Fetch certificate details from API
      fetch(`/api/certificates/${id}`)
        .then((response) => response.json())
        .then((cert) => {
          if (cert) {
            // Set modal data
            document.getElementById('modal-common-name').textContent = cert.commonName || '-';
            document.getElementById('modal-organization').textContent = cert.organization || '-';
            document.getElementById('modal-org-unit').textContent = cert.organizationalUnit || '-';
            document.getElementById('modal-serial-number').textContent = cert.serialNumber || '-';
            document.getElementById('modal-valid-from').textContent = formatDate(cert.validFrom);
            document.getElementById('modal-valid-to').textContent = formatDate(cert.validTo);
            document.getElementById('modal-issuer').textContent = cert.issuer || '-';
            document.getElementById('modal-filename').textContent = cert.originalName || cert.filename;

            // Set action buttons
            const downloadBtn = document.getElementById('modal-download-btn');
            const deleteBtn = document.getElementById('modal-delete-btn');

            downloadBtn.href = `/api/certificates/${id}/download`;
            deleteBtn.onclick = function () {
              certificateDetailsModal.hide();
              setTimeout(() => {
                document.querySelector(`.delete-certificate[data-id="${id}"]`).click();
              }, 500);
            };

            // Show modal
            certificateDetailsModal.show();
          } else {
            alert('Failed to load certificate details');
          }
        })
        .catch((error) => {
          console.error('Error loading certificate details:', error);
          alert('An error occurred while loading certificate details');
        });
    });
  });

  // Format date helper function
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }
});
