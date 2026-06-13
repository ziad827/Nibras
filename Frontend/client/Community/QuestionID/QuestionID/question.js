window.NibrasReact.run(() => {
  // --- 1. SIDEBAR LOGIC ---
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach((link) => {
    link.addEventListener('click', (e) => {
      navLinks.forEach((n) => n.classList.remove('active'));
      link.classList.add('active');
    });
  });

  // --- 2. SINGLE QUESTION DATA ---
  const currentQuestion = {
    id: 1,
    title: 'How to implement a binary search tree efficiently?',
    // HTML Content allowed for rich text
    body: `I'm struggling with the insertion and deletion operations in BST. Can someone explain the best approach considering time complexity? I understand the basic concept but I'm having trouble with maintaining the BST property during complex operations. Specifically, I need help with:
        <ul>
            <li>Proper node insertion while maintaining balance</li>
            <li>Handling edge cases during deletion (nodes with 0, 1, or 2 children)</li>
            <li>Optimizing search operations</li>
            <li>Best practices for memory management</li>
        </ul>`,
    author: 'Alex Johnson',
    authorInitials: 'AJ',
    votes: 8,
    views: '2 hours ago',
    tags: ['data-structures', 'trees', 'algorithms'],
    replies: [
      {
        id: 101,
        votes: 12,
        author: 'Dr. Sarah Johnson',
        role: 'Expert',
        initials: 'DSJ',
        time: '2 hours ago',
        rep: '7247 rep',
        text: 'The key to implementing an efficient BST is to maintain balance. I recommend looking into AVL trees or Red-Black trees. They guarantee O(log n) operations by automatically rebalancing after insertions and deletions.',
      },
      {
        id: 102,
        votes: 8,
        author: 'Michael Chen',
        role: 'Helper',
        initials: 'MC',
        time: '1 hour ago',
        rep: '5891 rep',
        text: "Building on Sarah's answer, if you're implementing in JavaScript, you'll want to use a class-based approach. Start with the basic Node class, then implement insert, search, and delete methods. Don't forget to handle edge cases like empty trees and single-node trees.",
      },
      {
        id: 103,
        votes: 5,
        author: 'Alex Aderman',
        role: 'Rising Star',
        initials: 'AA',
        time: '45 minutes ago',
        rep: '4523 rep',
        text: "Here's a quick tip: when implementing the search method, always compare values recursively. If the target value is less than the current node, go left; if greater, go right. This is the essence of BST efficiency!",
      },
    ],
  };

  // --- 3. RENDER FUNCTION ---
  renderDetailView(currentQuestion);

  function renderDetailView(q) {
    // A. Render Tags
    let tagHtml = '';
    q.tags.forEach((t) => {
      let color = 't-default';
      if (['data-structures'].includes(t)) color = 't-red';
      if (['trees'].includes(t)) color = 't-purple';
      if (['algorithms'].includes(t)) color = 't-blue';
      tagHtml += `<span class="tag ${color}">${t}</span>`;
    });

    // B. Render Main Question
    const detailMain = document.getElementById('q-main-content');
    detailMain.innerHTML = `
            <div class="q-vote-box">
                <i class="fa-solid fa-chevron-up vote-arrow up"></i>
                <span class="vote-count">${q.votes}</span>
                <i class="fa-solid fa-chevron-down vote-arrow down"></i>
            </div>
            <div class="detail-content">
                <h1 class="detail-title">${q.title}</h1>
                <div class="detail-body">${q.body}</div>
                <div class="detail-tags">${tagHtml}</div>
                <div class="detail-footer">
                    <div class="detail-actions">
                        <span>Asked ${q.views}</span>
                        <i class="fa-solid fa-share-nodes"></i>
                        <i class="fa-regular fa-bookmark"></i>
                    </div>
                    <div class="detail-author-box">
                        <div class="author-av" style="width:36px; height:36px;">${q.authorInitials}</div>
                        <div class="detail-author-info">
                            <span class="detail-author-name">${q.author}</span>
                            <span class="detail-author-meta">2847 rep</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

    // C. Render Answers
    document.getElementById('answers-count-header').textContent =
      `${q.replies.length} Answers`;
    const ansContainer = document.getElementById('answers-container');
    ansContainer.innerHTML = '';

    q.replies.forEach((ans) => {
      // Role Badge Logic
      let roleBadge = '';
      let roleText = 'Student'; // Default role text

      if (ans.role) {
        const roleStr = String(ans.role);
        // Check if it's an ObjectId (24-char hex) - don't display it
        if (!/^[0-9a-fA-F]{24}$/.test(roleStr)) {
          roleText = roleStr;
        }

        let color = 'bg-blue';
        if (roleText === 'Helper') color = 'bg-green';
        if (roleText === 'Rising Star') color = 'bg-purple';
        if (roleText === 'Instructor' || roleText === 'instructor')
          color = 'bg-purple';
        if (roleText === 'Admin' || roleText === 'admin') color = 'bg-red';
        roleBadge = `<span class="contrib-badge ${color}">${roleText}</span>`;
      }

      ansContainer.innerHTML += `
                <div class="answer-card">
                    <div class="q-vote-box">
                        <i class="fa-solid fa-chevron-up vote-arrow up"></i>
                        <span class="vote-count">${ans.votes}</span>
                        <i class="fa-solid fa-chevron-down vote-arrow down"></i>
                    </div>
                    <div class="detail-content">
                        <div class="detail-body" style="margin-bottom:1.5rem">${ans.text}</div>
                        <div class="detail-footer">
                            <div class="detail-actions">
                                <span>${ans.time}</span>
                            </div>
                            <div class="detail-author-box">
                                <div class="author-av" style="width:36px; height:36px;">${ans.initials}</div>
                                <div class="detail-author-info">
                                    <div style="display:flex; align-items:center">
                                        <span class="detail-author-name">${ans.author}</span>
                                        ${roleBadge}
                                    </div>
                                    <span class="detail-author-meta">${ans.rep}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
    });
  }

  // --- 4. VOTING LOGIC (Global) ---
  document.body.addEventListener('click', (e) => {
    if (e.target.classList.contains('vote-arrow')) {
      const btn = e.target;
      const voteBox = btn.closest('.q-vote-box');
      const countSpan = voteBox.querySelector('.vote-count');
      let currentVotes = parseInt(countSpan.innerText);

      // Handle UP
      if (btn.classList.contains('up')) {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          currentVotes--;
        } else {
          btn.classList.add('active');
          currentVotes++;
          const sibling = voteBox.querySelector('.down');
          if (sibling.classList.contains('active')) {
            sibling.classList.remove('active');
            currentVotes++;
          }
        }
      }
      // Handle DOWN
      else if (btn.classList.contains('down')) {
        if (btn.classList.contains('active')) {
          btn.classList.remove('active');
          currentVotes++;
        } else {
          btn.classList.add('active');
          currentVotes--;
          const sibling = voteBox.querySelector('.up');
          if (sibling.classList.contains('active')) {
            sibling.classList.remove('active');
            currentVotes--;
          }
        }
      }
      // Update Text
      countSpan.innerText = currentVotes;
    }
  });

  // --- 5. THEME TOGGLE ---
  const themeBtn = document.getElementById('themeBtn');
  const themeIcon = themeBtn.querySelector('i');
  const appLogo = document.getElementById('app-logo');

  if (document.documentElement.getAttribute('data-theme') === 'dark') {
    themeIcon.className = 'fa-regular fa-sun';
    if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
  } else {
    if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
  }

  themeBtn.addEventListener('click', () => {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    if (current === 'light') {
      html.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
      themeIcon.className = 'fa-regular fa-sun';
      if (appLogo) appLogo.src = '/Assets/images/logo-dark.png';
    } else {
      html.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      themeIcon.className = 'fa-regular fa-moon';
      if (appLogo) appLogo.src = '/Assets/images/logo-light.png';
    }
  });
});
