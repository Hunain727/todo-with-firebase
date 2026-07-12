// ==================== FIREBASE INITIALIZATION ====================
// NOTE: Make sure to include the Firebase SDK scripts in your HTML file before this script.
//
// <!-- Firebase SDKs (add these to your <head> or before your app.js script tag) -->
// <!-- Find the latest version at https://firebase.google.com/docs/web/setup#available-libraries -->
// <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js"></script>
// <script src="https://www.gstatic.com/firebasejs/9.22.1/firebase-analytics-compat.js"></script>

const firebaseConfig = {
    apiKey: "AIzaSyBZKtT6ftnZRM6ZbpHbgvy4vDeFvJdJigo",
    authDomain: "todo-d6732.firebaseapp.com",
    projectId: "todo-d6732",
    storageBucket: "todo-d6732.firebasestorage.app",
    messagingSenderId: "748634752134",
    appId: "1:748634752134:web:075eb5c7e4ed4cabec7d07",
    measurementId: "G-8YQW6VNTHQ"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const analytics = firebase.analytics(app);
const auth = firebase.auth();
const db = firebase.firestore();

// Preloader
window.addEventListener('load', () => {
    const preloader = document.getElementById('preloader');
    if (preloader) {
        setTimeout(() => {
            preloader.classList.add('loader-hidden');
        }, 1000); // Wait 1 second before hiding
    }
});

// App State
let currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            // User is signed in.
            db.collection('users').doc(user.uid).get().then(doc => {
                if (doc.exists) {
                    currentUser = { uid: user.uid, email: user.email, ...doc.data() };
                } else {
                    // Fallback if user doc doesn't exist for some reason
                    currentUser = { uid: user.uid, email: user.email, name: user.email };
                }
                updateUIForLoggedInUser();
                const currentHash = window.location.hash.substring(1);
                if (!currentHash || currentHash === 'login' || currentHash === 'signup' || currentHash === 'home') {
                    showSection('posts');
                } else {
                    showSection(currentHash);
                }
            });
        } else {
            // User is signed out.
            currentUser = null;
            updateUIForLoggedOutUser();
            showSection('home');
        }
    });
});

// ==================== NAVIGATION ====================

function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Update URL
    window.location.hash = sectionId;
    
    // Close mobile menu
    document.querySelector('.nav-links').classList.remove('active');
    
    // Load posts if posts section is shown
    if (sectionId === 'posts') {
        displayPosts();
    }
}

function toggleMenu() {
    document.querySelector('.nav-links').classList.toggle('active');
}

// ==================== AUTHENTICATION ====================

async function handleSignup(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    const confirmPassword = document.getElementById('signupConfirmPassword').value;

    if (password !== confirmPassword) {
        showToast('Passwords do not match!', 'error');
        return;
    }
    if (password.length < 6) {
        showToast('Password must be at least 6 characters!', 'error');
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Store user's name in Firestore
        await db.collection('users').doc(user.uid).set({
            name: name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Account created successfully!', 'success');
        document.getElementById('signupForm').reset();
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Logged in successfully!', 'success');
        document.getElementById('loginForm').reset();
        // onAuthStateChanged will handle the redirect
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function logout(event) {
    if (event) event.preventDefault();
    try {
        await auth.signOut();
        showToast('Logged out successfully!', 'success');
        // onAuthStateChanged will handle UI updates and redirection
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function updateUIForLoggedInUser() {
    const navLogin = document.getElementById('navLogin');
    const navSignup = document.getElementById('navSignup');
    const navLogout = document.getElementById('navLogout');
    const navPosts = document.getElementById('navPosts');
    const navAddPost = document.getElementById('navAddPost');

    navLogin.style.display = 'none';
    navSignup.style.display = 'none';
    navLogout.style.display = 'block';
    navPosts.style.display = 'block';
    navAddPost.style.display = 'block';
}

function updateUIForLoggedOutUser() {
    const navLogin = document.getElementById('navLogin');
    const navSignup = document.getElementById('navSignup');
    const navLogout = document.getElementById('navLogout');
    const navPosts = document.getElementById('navPosts');
    const navAddPost = document.getElementById('navAddPost');

    navLogin.style.display = 'block';
    navSignup.style.display = 'block';
    navLogout.style.display = 'none';
    navPosts.style.display = 'none';
    navAddPost.style.display = 'none';
}

// ==================== POSTS ====================

async function handleAddPost(event) {
    event.preventDefault();
    
    if (!currentUser) {
        showToast('Please login first!', 'error');
        showSection('login');
        return;
    }

    const title = document.getElementById('postTitle').value;
    const content = document.getElementById('postContent').value;
    const imageFile = document.getElementById('postImage').files[0];
    // Note: Image upload to Firebase Storage is not implemented here. Storing as Data URL.
    let imageUrl = null;

    if (imageFile) {
        if (imageFile.size > 2 * 1024 * 1024) { // 2MB limit
            showToast('Image size should not exceed 2MB.', 'error');
            return;
        }
        try {
            imageUrl = await readFileAsDataURL(imageFile);
        } catch (error) {
            showToast('Error reading image file.', 'error');
            return;
        }
    }

    const newPost = {
        title,
        content,
        imageUrl,
        author: currentUser.name,
        authorId: currentUser.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection('posts').add(newPost);
        showToast('Post added successfully!', 'success');
        document.getElementById('addPostForm').reset();
        showSection('posts');
    } catch (error) {
        showToast('Error adding post: ' + error.message, 'error');
    }
}

async function displayPosts() {
    const container = document.getElementById('postsContainer');
    const deleteAllBtn = document.getElementById('deleteAllBtn');
    
    if (!currentUser) {
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-lock"></i>
                <h3>Please login to view posts</h3>
                <button onclick="showSection('login')" class="btn btn-primary">Login</button>
            </div>
        `;
        deleteAllBtn.style.display = 'none';
        return;
    }
    
    // Fetch posts from Firestore for the current user
    const postsQuery = db.collection('posts')
        .where('authorId', '==', currentUser.uid)
        .orderBy('createdAt', 'desc');

    const snapshot = await postsQuery.get();
    const userPosts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
    
    if (userPosts.length === 0) {
        container.innerHTML = `
            <div class="no-posts">
                <i class="fas fa-inbox"></i>
                <h3>No posts yet</h3>
                <p>Create your first post!</p>
                <button onclick="showSection('addPost')" class="btn btn-primary">Add Post</button>
            </div>
        `;
        deleteAllBtn.style.display = 'none';
        return;
    }
    
    deleteAllBtn.style.display = 'block';

    container.innerHTML = userPosts.map(post => {
        const createdAt = post.createdAt ? post.createdAt.toDate() : new Date();
        return `
        <div class="post-card">
            ${post.imageUrl ? `<img src="${post.imageUrl}" alt="Post Image" class="post-main-image">` : ''}
            <div class="post-header">
                <div class="post-author">
                    <div class="post-avatar">${post.author.charAt(0).toUpperCase()}</div>
                    <div class="post-info">
                        <h3>${escapeHtml(post.title)}</h3>
                        <span>${post.author} • ${formatDate(createdAt)}</span>
                    </div>
                </div>
                <div class="post-actions">
                    <button onclick="openEditModal('${post.id}')" class="btn btn-sm btn-edit">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button onclick="deletePost('${post.id}')" class="btn btn-sm btn-delete">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
            <div class="post-content">
                ${escapeHtml(post.content)}
            </div>
        </div>
    `}).join('');
}

function deletePost(postId) {
    Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!"
    }).then((result) => {
        if (result.isConfirmed) {
            db.collection('posts').doc(postId).delete();
            displayPosts();
            Swal.fire(
                'Deleted!',
                'Your post has been deleted.',
                'success'
            );
        }
    });
}

function deleteAllPosts() {
    Swal.fire({
        title: 'Are you sure?',
        text: "You are about to delete all your posts. This action cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d53f3a',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete all!'
    }).then((result) => {
        if (result.isConfirmed) {
            const batch = db.batch();
            db.collection('posts').where('authorId', '==', currentUser.uid).get()
                .then(snapshot => {
                    snapshot.docs.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                    return batch.commit();
                });

            displayPosts();
            Swal.fire(
                'Deleted!',
                'All your posts have been deleted.',
                'success'
            );
        }
    });
}

// ==================== EDIT POST ====================

async function openEditModal(postId) {
    const doc = await db.collection('posts').doc(postId).get();
    if (!doc.exists) {
        showToast('Post not found!', 'error');
        return;
    }

    const post = { id: doc.id, ...doc.data() };

    document.getElementById('editPostId').value = post.id;
    document.getElementById('editPostTitle').value = post.title;
    document.getElementById('editPostContent').value = post.content;

    const imagePreview = document.getElementById('editPostImagePreview');
    if (post.imageUrl) {
        imagePreview.src = post.imageUrl;
        imagePreview.style.display = 'block';
    } else {
        imagePreview.style.display = 'none';
    }

    document.getElementById('editModal').style.display = 'block';
}

function closeEditModal() {
    document.getElementById('editModal').style.display = 'none';
    document.getElementById('editPostForm').reset();
    const imagePreview = document.getElementById('editPostImagePreview');
    imagePreview.style.display = 'none';
    imagePreview.src = '';
}

async function handleUpdatePost(event) {
    event.preventDefault();
    
    const postId = document.getElementById('editPostId').value;
    const title = document.getElementById('editPostTitle').value;
    const content = document.getElementById('editPostContent').value;
    const imageFile = document.getElementById('editPostImage').files[0];

    const updatedPostData = {
        title,
        content,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (imageFile) {
        if (imageFile.size > 2 * 1024 * 1024) { // 2MB limit
            showToast('Image size should not exceed 2MB.', 'error');
            return;
        }
        try {
            updatedPostData.imageUrl = await readFileAsDataURL(imageFile);
        } catch (error) {
            showToast('Error reading image file.', 'error');
            return;
        }
    }

    try {
        await db.collection('posts').doc(postId).update(updatedPostData);
        showToast('Post updated successfully!', 'success');
        closeEditModal();
        displayPosts();
    } catch (error) {
        showToast('Error updating post: ' + error.message, 'error');
    }
}

// ==================== UTILITIES ====================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('editModal');
    if (event.target === modal) {
        closeEditModal();
    }
}

// Handle browser back/forward buttons
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.slice(1) || 'home';
    // Only show section if it's not an auth page and user is logged out
    if (currentUser || ['home', 'login', 'signup'].includes(hash)) {
        showSection(hash);
    }
});
