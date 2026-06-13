import json, os

# Level mappings (all courses from courseData.js)
beginner_courses = [
    {"code": "CS106A", "title": "Programming Methodology", "category": "core"},
    {"code": "CS106B", "title": "Programming Abstractions", "category": "core"},
    {"code": "CS106X", "title": "Programming Abstractions (Accelerated)", "category": "core"},
    {"code": "MATH 18", "title": "Foundations for Calculus", "category": "core"},
    {"code": "MATH 19", "title": "Calculus I", "category": "core"},
    {"code": "MATH 20", "title": "Calculus II", "category": "core"},
    {"code": "MATH 21", "title": "Calculus III / Calculus with Infinite Processes", "category": "core"},
    {"code": "MATH 51", "title": "Linear Algebra, Multivariable Calculus, & Optimization", "category": "core"},
    {"code": "MATH 52", "title": "Multivariable Integration & Ordinary Differential Equations", "category": "core"},
    {"code": "MATH 53", "title": "Differential Calculus of Several Variables", "category": "core"},
    {"code": "CS 103", "title": "Mathematical Foundations of Computing", "category": "core"},
    {"code": "CS 109", "title": "Probability for Computer Scientists / Theory of Probability", "category": "core"},
    {"code": "PHYS 41", "title": "Introductory Mechanics Course (Classical Mechanics)", "category": "core"},
    {"code": "PHYS 43", "title": "Electricity and Magnetism", "category": "core"},
    {"code": "BIO", "title": "Biology", "category": "core"},
    {"code": "CHEM", "title": "Chemistry", "category": "core"},
]

intermediate_courses = [
    {"code": "CS 107", "title": "Computer Organization & Systems", "category": "core"},
    {"code": "CS 110", "title": "Principles of Computer Systems / Operating Systems Principles", "category": "core"},
    {"code": "CS 157", "title": "Computational Logic", "category": "core"},
    {"code": "CS 161", "title": "Design & Analysis of Algorithms", "category": "core"},
    {"code": "CS 181", "title": "Computers, Ethics, and Public Policy", "category": "elective"},
    {"code": "CS 181W", "title": "Computers, Ethics, and Public Policy (WIM)", "category": "elective"},
    {"code": "CS 194", "title": "Software Project", "category": "core"},
    {"code": "CS 205L", "title": "Continuous Mathematical Methods with an Emphasis on Machine Learning", "category": "core"},
    {"code": "CS 210", "title": "Software Project Experience with Corporate Partners", "category": "core"},
    {"code": "CS 294", "title": "Research Project in Computer Science", "category": "core"},
    {"code": "MATH 104", "title": "Applied Matrix Theory", "category": "core"},
    {"code": "MATH 107", "title": "Graph Theory", "category": "core"},
    {"code": "MATH 108", "title": "Introduction to Combinatorics and Its Applications", "category": "core"},
    {"code": "MATH 109", "title": "Groups and Symmetry", "category": "core"},
    {"code": "MATH 110", "title": "Number Theory for Cryptography", "category": "core"},
    {"code": "MATH 113", "title": "Linear Algebra and Matrix Theory", "category": "core"},
    {"code": "EE 102", "title": "Introduction to Signals & Systems", "category": "core"},
    {"code": "ENGR 40M", "title": "Making: Integrated Engineering", "category": "elective"},
    {"code": "ENGR 76", "title": "Information Science & Engineering", "category": "elective"},
    {"code": "PHIL 251", "title": "Metalogic (PHIL 251)", "category": "core"},
    {"code": "Other EF", "title": "See Stanford list of approved EF courses", "category": "elective"},
    {"code": "STS options", "title": "Science, Technology, and Society courses", "category": "elective"},
]

advanced_courses = [
    {"code": "CS 221", "title": "Artificial Intelligence: Principles and Techniques", "category": "AI", "track": "AI"},
    {"code": "CS 229", "title": "Machine Learning", "category": "AI", "track": "AI"},
    {"code": "CS 224N", "title": "Natural Language Processing with Deep Learning", "category": "AI", "track": "AI"},
    {"code": "CS 140", "title": "Operating Systems & Systems Programming", "category": "Systems", "track": "Systems"},
    {"code": "CS 143", "title": "Compilers", "category": "Systems", "track": "Systems"},
    {"code": "CS 144", "title": "Introduction to Computer Networking", "category": "Systems", "track": "Systems"},
    {"code": "CS 149", "title": "Parallel Computing", "category": "Systems", "track": "Systems"},
    {"code": "CS 154", "title": "Introduction to Automata and Complexity Theory", "category": "Theory", "track": "Theory"},
]

expert_courses = [
    {"code": "CS 231N", "title": "Deep Learning for Computer Vision", "category": "AI", "track": "AI"},
    {"code": "CS 234", "title": "Reinforcement Learning", "category": "AI", "track": "AI"},
    {"code": "CS 238", "title": "Decision Making under Uncertainty", "category": "AI", "track": "AI"},
    {"code": "CS 155", "title": "Computer and Network Security", "category": "Systems", "track": "Systems"},
    {"code": "CS 240", "title": "Adv. Topics in Operating Systems", "category": "Systems", "track": "Systems"},
]

lectures_data = {
    "CS106A": [
        {"lecture": 1, "title": "Welcome to Code in Place", "videos": [{"title": "Welcome", "type": "youtube", "id": "dxZFXJhZPvU"}, {"title": "General Info", "type": "youtube", "id": "ukpUVAhdo94"}, {"title": "Karel", "type": "youtube", "id": "LpxjnuQwTg4"}]},
        {"lecture": 2, "title": "Control Flow in Karel", "videos": [{"title": "Recap", "type": "youtube", "id": "xAQlbo82EuU"}, {"title": "For Loops", "type": "youtube", "id": "yVmGFatf-Y8"}, {"title": "While Loops", "type": "youtube", "id": "S5y2u7VITMo"}, {"title": "If/Else", "type": "youtube", "id": "ACkcPIB5SZs"}, {"title": "Steeple Chase", "type": "youtube", "id": "nxu8NBAv2pM"}]},
        {"lecture": 3, "title": "Decomposition", "videos": [{"title": "Recap", "type": "youtube", "id": "YFWUzglTrBQ"}, {"title": "Morning", "type": "youtube", "id": "Cz-wnRvlAMI"}, {"title": "Mountain", "type": "youtube", "id": "ecqDCBm8tkY"}, {"title": "Rhoomba", "type": "youtube", "id": "JIQr_gtAWrc"}, {"title": "WordSearch", "type": "youtube", "id": "62RtoSXfitU"}]},
        {"lecture": 4, "title": "Variables in Python", "videos": [{"title": "Recap", "type": "youtube", "id": "pkh2gDQ8tjM"}, {"title": "HelloWorld", "type": "youtube", "id": "wEbmXvfl8TM"}, {"title": "Add2Numbers", "type": "youtube", "id": "oUuIMt5KmyQ"}]},
        {"lecture": 5, "title": "Expressions", "videos": [{"title": "Recap", "type": "youtube", "id": "YwePpeJn828"}, {"title": "Expressions", "type": "youtube", "id": "iTBsRFnaoJ0"}, {"title": "Constants", "type": "youtube", "id": "sAo9IdC223s"}, {"title": "Math Library", "type": "youtube", "id": "H90Ud28sedo"}, {"title": "Random Numbers", "type": "youtube", "id": "SQ2_cDLgrHI"}, {"title": "Dice Simulator", "type": "youtube", "id": "_rMzEF0v6UI"}]},
        {"lecture": 6, "title": "Control Flow in Python", "videos": [{"title": "Recap", "type": "youtube", "id": "60AMFkbGZGY"}, {"title": "Conditions", "type": "youtube", "id": "c6CZIQ3UFZE"}, {"title": "Guess Num and Sentinel Sum", "type": "youtube", "id": "Y_IWN4OxhlM"}, {"title": "Booleans", "type": "youtube", "id": "Y7evkU5j7TY"}, {"title": "For Loops", "type": "youtube", "id": "5BTJ4gVXaFQ"}, {"title": "GameShow Teaser", "type": "youtube", "id": "mVoerPV6YLY"}]},
        {"lecture": 7, "title": "Functions Revisited", "videos": [{"title": "Recap with GameShow", "type": "youtube", "id": "wY68LUvnJ04"}, {"title": "Functions are like Toasters", "type": "youtube", "id": "hmcuptr9WBE"}, {"title": "Anatomy of a Function", "type": "youtube", "id": "lZ8DGnIRsng"}, {"title": "Many Examples", "type": "youtube", "id": "CS-BMynY5ko"}, {"title": "I/O", "type": "youtube", "id": "8vXvRwj8fos"}]},
        {"lecture": 8, "title": "Functions: More Practice", "videos": [{"title": "Recap", "type": "youtube", "id": "vMy48Q6aPk0"}, {"title": "Factorial", "type": "youtube", "id": "kZpiuJ1r3rg"}, {"title": "DocTests", "type": "youtube", "id": "rXtLAPxeSgI"}, {"title": "Passing Primitives", "type": "youtube", "id": "vmzFKkyjo4o"}, {"title": "Calendar", "type": "youtube", "id": "8PCQndHgkPE"}]},
        {"lecture": 9, "title": "Images", "videos": [{"title": "Recap", "type": "youtube", "id": "gjT_okH7HD8"}, {"title": "Images in Python", "type": "youtube", "id": "iC82OUseeeY"}, {"title": "First Examples", "type": "youtube", "id": "aeGbb8wC56g"}, {"title": "GreenScreen", "type": "youtube", "id": "pAG9rAqA4N4"}, {"title": "Mirrored", "type": "youtube", "id": "x0PpSbK4k_s"}, {"title": "Nested For vs For Each Pixel", "type": "youtube", "id": "DhohL7AOzsw"}]},
        {"lecture": 10, "title": "Graphics", "videos": [{"title": "Recap", "type": "youtube", "id": "h9nnz_QSzZA"}, {"title": "Blue Rect", "type": "youtube", "id": "3RMrC1wWyFE"}, {"title": "Programming is Awesome", "type": "youtube", "id": "SfiEWn9RCXM"}, {"title": "Checkers", "type": "youtube", "id": "Y9Qi-6TWwpM"}]},
        {"lecture": 11, "title": "Animations", "videos": [{"title": "Recap", "type": "youtube", "id": "B8-lPPUU7eY"}, {"title": "Animation Loop", "type": "youtube", "id": "jz02xtVaBo8"}, {"title": "Move to Center", "type": "youtube", "id": "frTXMIWSuq0"}, {"title": "Bouncing Ball", "type": "youtube", "id": "qjsxi3UzoA0"}, {"title": "References", "type": "youtube", "id": "g0G4S_woMRA"}, {"title": "Pong", "type": "youtube", "id": "XcvbczJF6CU"}]},
        {"lecture": 12, "title": "Lists", "videos": [{"title": "Recap with Console", "type": "youtube", "id": "QioUAmUAIgE"}, {"title": "None", "type": "youtube", "id": "A-NrRd9GyYg"}, {"title": "Lists", "type": "youtube", "id": "vhknJZ-2Bzg"}, {"title": "Lists as Parameters", "type": "youtube", "id": "w4beNu04CMs"}, {"title": "AverageScores", "type": "youtube", "id": "L_TyVmOQq-I"}]},
        {"lecture": 13, "title": "Text Processing", "videos": [{"title": "Hook and Recap", "type": "youtube", "id": "BQQVnsE2DZI"}, {"title": "Working with Strings", "type": "youtube", "id": "xRhjkyJHFbE"}, {"title": "Helpful String Functions", "type": "youtube", "id": "MOhsuyHr6fU"}, {"title": "Just Number and DNA to mRNA", "type": "youtube", "id": "fNChmzR6rVs"}, {"title": "Characters", "type": "youtube", "id": "SnJYJHmNW7s"}, {"title": "Immutable", "type": "youtube", "id": "-cIzBBzTnK8"}, {"title": "ReverseString and Palindrome", "type": "youtube", "id": "PB4tJZHdcAk"}, {"title": "FakeMedicine", "type": "youtube", "id": "BbE4dnoAmXs"}]},
        {"lecture": 14, "title": "Dictionaries", "videos": [{"title": "Recap with Files", "type": "youtube", "id": "GyexyR1qwZE"}, {"title": "What are Dictionaries", "type": "youtube", "id": "iW6PlKk5XZk"}, {"title": "Mutability and Dictionaries", "type": "youtube", "id": "vN9qV2hHbGk"}, {"title": "Dictionapalooza", "type": "youtube", "id": "IUTaANNVS_w"}, {"title": "CountWords", "type": "youtube", "id": "Pvcvy0W38T8"}, {"title": "PhoneBook", "type": "youtube", "id": "jx8u6dFUxpY"}]},
    ],
    "CS106B": [
        {"lecture": i+1, "title": title, "videos": [{"title": f"Lecture {i+1}", "type": "mp4_url", "url": f"http://html5.stanford.edu/videos/courses/see/CS106B/CS106B-lecture{str(i+1).zfill(2)}.mp4"}]}
        for i, title in enumerate([
            "About the CS106 Series at Stanford", "Similarity between C++ & Java", "C++ Libraries - Standard Libraries",
            "C++ Console I/O", "Client Use of Templates", "More Containers", "Seeing Functions as Data",
            "Common Mistakes Stumbled Upon", "Thinking Recursively", "Refresh: Permute Code", "Backtracking Pseudocode",
            "Pointer Movie", "Coding with Linked List", "Algorithm Analysis", "Selection Sort",
            "Partitioning for Quicksort", "Sort Template with Callback", "Abstract Data Types",
            "Rules of Template Implementation", "Live Coding: Recap of Vector-based Implementation for Stack",
            "Buffer: Vector vs Stack", "Map as Vector", "Pathfinder Demo", "Compare Map Implementations",
            "Lexicon Case Study", "Final Showdown", "Guest Lecturer: Keith Schwarz"
        ])
    ],
    "CS106X": [
        {"lecture": i+1, "title": title, "videos": [{"title": f"Lecture {i+1}", "type": "bilibili", "bvid": "BV1PK411A7S4", "page": i+1}]}
        for i, title in enumerate([
            "Introduction", "Functions", "Strings, Streams, Grid", "Vector, Big-Oh", "Stacks and Queues",
            "Sets and Maps", "Recursion", "Recursion 2", "Recursion 3, Fractals", "Exhaustive Search",
            "Backtracking", "Backtracking 2", "Pointers and Nodes", "Linked Lists", "Linked Lists 2",
            "Classes", "Classes 2; Skip Lists", "Arrays", "Recursion 4, Memoization", "Recursion 5, Sudoku",
            "Implementing Map", "Graphs 1, DFS", "Graphs 2, BFS, Dijkstra", "Graphs 3 - A*, Kruskal",
            "Graphs 4 - Topological Sort", "Inheritance, Hashing", "Hashing 2, Inheritance 2",
            "Sorting", "Templates, STL", "What's Next"
        ])
    ],
    "MATH18": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction to Calculus", "fYyARMqiaag"), ("Functions and Their Properties", "1EGFSefe5II"),
            ("Linear Functions and Rates of Change", "SzLF-wLZF_I"), ("Polynomial and Rational Functions", "f-_UsIP5jyA"),
            ("Exponential and Logarithmic Functions", "VSqOZNULRjQ"), ("Trigonometric Functions", "OEE5-M4aY4k"),
            ("Limits and Continuity", "PqQ5v94_NGM"), ("Introduction to Derivatives", "962lLfW-8Jo"),
            ("Differentiation Rules", "EY6FHX6asU0"), ("Chain Rule and Implicit Differentiation", "AvCQQ3X4Nuc"),
            ("Derivatives of Trigonometric Functions", "qr1WXiq3S3k"), ("Related Rates", "RJJSiNz5oto"),
            ("Applications of Derivatives", "8dr1dZjfhmc"), ("Curve Sketching", "RUS4mKo9tBk"),
            ("Optimization Problems", "43Qt6wc44To"), ("Introduction to Integration", "Mx39JbbzEAo"),
            ("Definite Integrals", "qW89xdGfSzw"), ("Fundamental Theorem of Calculus", "nQ6tOORDQ3I"),
            ("Integration Techniques", "29GbRaQxtzY"), ("Integration by Parts", "-PYebK8DKPc"),
            ("Trigonometric Integrals", "8u6woY05aL0"), ("Integration of Rational Functions", "SWZcq_biZLw"),
            ("Area Between Curves", "b2ZFpE_yrLg"), ("Volumes of Revolution", "aiBD9aI69C8"),
            ("Volumes Using Cross-Sections", "F0uuW-I6icY"), ("Arc Length", "K0ORDCt5Ig0"),
            ("Sequences and Series", "xjtEfS0vY2o"), ("Infinite Series Convergence", "c7wur9Lixb0"),
            ("Power Series", "GJOJl47l2_4"), ("Taylor and Maclaurin Series", "BDmlottZVd4"),
            ("Parametric Equations and Polar Coordinates", "5Yuw1jCBq-0"),
        ])
    ],
    "MATH19": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Rate of Change", "7K1sB05pE0A"), ("Limits", "ryLdyDrBfvI"), ("Derivatives", "kCPVBl953eY"),
            ("Chain Rule", "4sTKcvYMNxk"), ("Implicit Differentiation", "5q_3FDOkVRQ"),
            ("Exponential and Log", "9v25gg2qJYE"), ("Exam 1 Review", "eHJuAByQf5A"),
            ("Linear and Quadratic Approximations", "BSAA0akmPEU"), ("Curve Sketching", "eRCN3daFCmU"),
            ("Max-min", "twzGBqPeW0M"), ("Related Rates", "YN7k_bXXggY"), ("Newton's Method", "sRIDVAcoG5A"),
            ("Mean Value Theorem", "4Q37iOyBq44"), ("Antiderivatives", "-MI0b4h3rS0"),
            ("Differential Equations", "60VGKnYBpbg"), ("Definite Integrals", "hjZhPczMkL4"),
            ("First Fundamental Theorem", "1RLctDS2hUQ"), ("Second Fundamental Theorem", "Pd2xP5zDsRw"),
            ("Applications to Logarithms", "_JXPe2J069c"), ("Volumes", "ShGBRUx2ub8"),
            ("Work, Probability", "R9a_NHXrBcg"), ("Numerical Integration", "jBkXbAgMj6s"),
            ("Exam 3 Review", "zUEuKrxgHws"), ("Trig Integrals", "Bv9kVDcj7yo"),
            ("Inverse Substitution", "CXKoCMVqM9s"), ("Partial Fractions", "HgEqXhsIq_g"),
            ("Integration by Parts", "aeXp1zC6Hls"), ("Parametric Equations", "TpWQlKHPyJ4"),
            ("Polar Coordinates", "XRkgBWbWvg4"), ("Exam 4 Review", "BGE3wb7H2PA"),
            ("Indeterminate Forms", "PNTnmH6jsRI"), ("Improper Integrals", "KhwQKE_tld0"),
            ("Infinite Series", "MK_0QHbUnIA"), ("Taylor's Series", "wOHrNt9ScYs"),
            ("Final Review", "--lPz7VFnKI"),
        ])
    ],
    "MATH20": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("The Natural Log Function", "H9eCT6f_Ftw"), ("Derivatives of Inverse Functions", "HnsUNWNYZ28"),
            ("Derivatives and Integrals of Exponential Functions", "5HlW7OnXUT4"),
            ("Derivatives and Integrals of General Exponential Functions", "rR8imSHCuFk"),
            ("Calculus of Inverse Trigonometric Functions", "ST3ORfqVYQw"),
            ("A Discussion of Hyperbolic Functions", "3kPg0gkJQgc"),
            ("Evaluating Limits of Indeterminate Forms", "Zd7wd24jeok"),
            ("Integration By Parts", "EOwjiFpDY_s"), ("Techniques For Trigonometric Integrals", "pLrUBjiEo-w"),
            ("Integrals By Trigonometric Substitution", "q6JwTGpG8b4"),
            ("Integration By Partial Fractions", "KJGp0pyPoVo"), ("Improper Integrals", "g-M8FHslgdk"),
            ("Differential Equations", "WxVaVzxsDb0"), ("Convergence and Divergence of Sequences", "FoNLQvf4NUs"),
            ("Series and Divergence Test", "DGcWMdW-72M"), ("Integral Test for Series", "8jPpNK4GIVs"),
            ("Comparison Test for Series", "ei8WKMAHky0"), ("Alternating Series Test", "BhYPrQHDrjk"),
            ("Absolute Convergence and Ratio Test", "g4iZJOwMkjU"), ("Power Series", "TGD-TP1c7i4"),
            ("Taylor and Maclaurin Series", "3VHol7eosLA"), ("Taylor Polynomials", "RbreIk02B3c"),
            ("Parametric Equations", "d4KADBFqpR0"), ("Calculus of Parametric Equations", "1H6HrfX_qCA"),
            ("Polar Coordinates", "sWUyFQQ5QeI"), ("Calculus of Polar Equations", "Kh265EC11OI"),
            ("Numerical Integration", "RTX-ik_8i-k"),
        ])
    ],
    "MATH21": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("An Introduction to Vectors", "tGVnBAHLApA"), ("Vectors in 3-D Coordinate System", "ZAv3bF2GznI"),
            ("Using the Dot Product", "TKlGMRghcDs"), ("The Cross Product", "qqfhgStQ-cA"),
            ("Lines and Planes in 3-D", "IB1-lrPQjCw"), ("Cylinders and Surfaces in 3-D", "aBlKxFsoMZw"),
            ("Using Cylindrical and Spherical Coordinates", "rDeo721ogtk"),
            ("An Introduction To Vector Functions", "YThPIdcwr78"),
            ("Derivatives and Integrals of Vector Functions", "v_o-allq8LQ"),
            ("Arc Length and Parameterization", "Hu72QVWsMlg"), ("TNB Frames, Curvature, Torsion", "l7eDxflL-e0"),
            ("Velocity and Acceleration", "yq4Cj1_bmnE"), ("Intro to Multivariable Functions", "nIJQPX5kxp4"),
            ("Limits and Continuity of Multivariable Functions", "MFF4mvyhAyA"),
            ("Partial Derivatives", "EkZGBdY0vlg"), ("Differentials of Multivariable Functions", "J72AKZtUpgY"),
            ("The Chain Rule for Multivariable Functions", "tXryaM-mTpY"),
            ("Directional Derivatives and Gradients", "tDPp5uWSIiU"),
            ("Tangent Planes and Normal Lines", "yLbqHfuWsr8"),
            ("Extrema of Functions of 2 Variables", "kPL28zgEFk8"),
            ("Constrained Optimization with LaGrange Multipliers", "nUfYR5FBGZc"),
            ("Introduction to Double Integrals", "lv_awaaT6gY"),
            ("Double/Repeated/Iterated Integrals", "HxRG_phgGUw"),
            ("Double Integrals over Polar Regions", "HA41kYxVYnw"),
            ("Center of Mass for Lamina in 2-D", "WNZ8vMgaPgg"),
            ("Triple Integrals", "uTLM_iEcVdA"),
            ("Triple Integrals with Cylindrical and Spherical Coordinates", "R4vnw-yPnZ8"),
            ("Change of Variables in Multiple Integrals", "VVPu5fWssPg"),
            ("Introduction to Vector Fields", "71Z1RVYZ8HY"),
            ("Divergence and Curl of Vector Fields", "TMWevkxtS9s"),
            ("Line Integrals Over Non-Conservative Fields", "t6vtOOAnqyU"),
            ("Line Integrals on Conservative Vector Fields", "HhopxDkW4L8"),
            ("Green's Theorem", "OnyCk62hEL4"),
            ("Surface and Flux Integrals", "sQ0BJ3H-cZ8"),
        ])
    ],
    "MATH51": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("The Geometry of Linear Equations", "J7DzL2_Na80"), ("Elimination with Matrices", "QVKj3LADCnA"),
            ("Multiplication and Inverse Matrices", "FX4C-JpTFgY"), ("Factorization into A = LU", "MsIvs_6vC38"),
            ("Transposes, Permutations, Spaces R^n", "JibVXBElKL0"), ("Column Space and Nullspace", "8o5Cmfpeo6g"),
            ("Solving Ax = 0", "VqP2tREMvt0"), ("Solving Ax = b", "9Q1q7s1jTzU"),
            ("Independence, Basis, and Dimension", "yjBerM5jWsc"), ("The Four Fundamental Subspaces", "nHlE7EgJFds"),
            ("Matrix Spaces", "2IdtqGM6KWU"), ("Graphs and Networks", "6-wh6yvk6uc"),
            ("Quiz 1 Review", "l88D4r74gtM"), ("Orthogonal Vectors and Subspaces", "YzZUIYRCE38"),
            ("Projections and Least Squares", "Y_Ac6KiQ1t0"), ("Projection Matrices and Least Squares", "osh80YCg_GM"),
            ("Orthogonal Matrices and Gram-Schmidt", "0MtwqhIwdrI"), ("Gram-Schmidt and A = QR", "srxexLishgY"),
            ("Determinants", "23LLB9mNJvc"), ("Determinant Properties and Volume", "QNpj-gOXW9M"),
            ("Eigenvalues and Eigenvectors", "cdZnhQjJu4I"), ("Diagonalization and Powers of A", "13r9QY6cmjc"),
            ("Differential Equations", "IZqwi0wJovM"), ("Complex Matrices", "lGGDIGizcQ0"),
            ("Similar Matrices and Jordan Form", "UCc9q_cAhho"), ("SVD", "M0Sa8fLOajA"),
            ("SVD Applications", "vF7eyJ2g3kU"), ("Quiz 2 Review", "TSdXJw83kyA"),
            ("Linear Transformations", "TX_vooSnhm8"), ("Change of Basis", "Ts3o2I8_Mxc"),
            ("Left Inverse and Right Inverse", "0h43aV4aH7I"), ("Final Course Review", "HgC1l_6ySkc"),
            ("Final Exam Review", "Go2aLo7ZOlU"), ("Summary of Linear Algebra", "RWvi4Vx4CDc"),
        ])
    ],
    "MATH52": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("The Geometrical View of y'=f(x,y): Direction Fields, Integral Curves", "XDhJ8lVGbl8"),
            ("Euler's Numerical Method for y'=f(x,y) and its Generalizations", "LbKKzMag5Rc"),
            ("Solving First-order Linear ODE's; Steady-state and Transient Solutions", "tVzaX9u6YAE"),
            ("First-order Substitution Methods: Bernouilli and Homogeneous ODE's", "WBJ_iXudb-s"),
            ("First-order Autonomous ODE's: Qualitative Methods, Applications", "te6Mplq3DCU"),
            ("Complex Numbers and Complex Exponentials", "EQJBp6Ym-6A"),
            ("First-order Linear with Constant Coefficients: Behavior of Solutions, Use of Complex Methods", "SioXozu-Loo"),
            ("Continuation: Applications to Temperature, Mixing, RC-circuit, Decay, and Growth Models", "MdzfsfBNJIw"),
            ("Solving Second-order Linear ODE's with Constant Coefficients: The Three Cases", "vP-oRQqmeg4"),
            ("Continuation: Complex Characteristic Roots; Undamped and Damped Oscillations", "YQ7HEE8-OfA"),
            ("Theory of General Second-order Linear Homogeneous ODE's: Superposition, Uniqueness, Wronskians", "rZ3-nFV6l8w"),
            ("Continuation: General Theory for Inhomogeneous ODE's. Stability Criteria", "eyNm7XGJr4s"),
            ("Finding Particular Solutions to Inhomogeneous ODE's: Operator and Solution Formulas", "9KbpbBMThTE"),
            ("Interpretation of the Exceptional Case: Resonance", "Y9_zrupnz0Q"),
            ("Introduction to Fourier Series; Basic Formulas for Period 2π", "EWWw0jryj1A"),
            ("Continuation: More General Periods; Even and Odd Functions; Periodic Extension", "xWa5_OXI6VM"),
            ("Finding Particular Solutions via Fourier Series; Resonant Terms; Hearing Musical Sounds", "yD0_EQLxHcw"),
            ("Engineering Applications (Guest Lecture)", "pRIEYR5JHQA"),
            ("Introduction to the Laplace Transform; Basic Formulas", "sZ2qulI6GEk"),
            ("Derivative Formulas; Using the Laplace Transform to Solve Linear ODE's", "qZHseRxAWZ8"),
            ("Convolution Formula: Proof, Connection with Laplace Transform, Application to Physical Problems", "3ejfkMHr_DE"),
            ("Using Laplace Transform to Solve ODE's with Discontinuous Inputs", "_YVcjNmjHik"),
            ("Use with Impulse Inputs; Dirac Delta Function, Weight and Transfer Functions", "peYvLk_HZdw"),
            ("Introduction to First-order Systems of ODE's", "MCrDzhpu3-s"),
            ("Homogeneous Linear Systems with Constant Coefficients: Solution via Matrix Eigenvalues", "heBvViSi9xQ"),
            ("Continuation: Repeated Real Eigenvalues, Complex Eigenvalues", "hEtWqTPPXuc"),
            ("Sketching Solutions of 2x2 Homogeneous Linear System", "e3FfmXtkppM"),
            ("Matrix Methods for Inhomogeneous Systems: Theory, Fundamental Matrix, Variation of Parameters", "2SuTN8rpe4I"),
            ("Matrix Exponentials; Application to Solving Systems", "zreI4HllD80"),
            ("Decoupling Linear Systems with Constant Coefficients", "uNOyxQwIV8o"),
            ("Non-linear Autonomous Systems: Finding the Critical Points and Sketching Trajectories", "UJG0f0BSX14"),
            ("Limit Cycles: Existence and Non-existence Criteria", "z-meBrqcy_I"),
            ("Relation Between Non-linear Systems and First-order ODE's; Structural Stability", "kRR9EVzr4lc"),
        ])
    ],
    "MATH53": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Dot Product", "PxCxlsl_YwY"), ("Lecture 2", "9FLItlbBUPY"), ("Lecture 3", "bHdzkFrgRcA"),
            ("Lecture 4", "YBajUR3EFSM"), ("Lecture 5", "57jzPlxf4fk"), ("Lecture 6", "0D4BbCa4gHo"),
            ("Lecture 7", "U1EcnfTKXJ0"), ("Lecture 8", "dK3NEf13nPc"), ("Lecture 9", "UYe98CcxPbs"),
            ("Lecture 10", "3_goGnJm5sA"), ("Lecture 11", "7eZVshlT33Q"), ("Lecture 12", "2XraaWefBd8"),
            ("Lecture 13", "15HVevXRsBA"), ("Lecture 14", "23xbkrpQuAo"), ("Lecture 15", "ChiM2-MV-qM"),
            ("Lecture 16", "YP_B0AapU0c"), ("Lecture 17", "60e4hdCi1D4"), ("Lecture 18", "UZb9hZIAvL4"),
            ("Lecture 19", "xrypSZU8cBE"), ("Lecture 20", "o7UCBjGsRTE"), ("Lecture 21", "z5TPjZrsp2k"),
            ("Lecture 22", "tYdoS0tkAHA"), ("Lecture 23", "_CdoRiNSrqI"), ("Lecture 24", "PnPIqh7Frlw"),
            ("Lecture 25", "44R5HgbrUmc"), ("Lecture 26", "RMBGQtwkoyU"), ("Lecture 27", "phk05iSMezA"),
            ("Lecture 28", "WfEQabCGAqI"), ("Lecture 29", "wu8kXZSAp20"), ("Lecture 30", "seO7-TwXH_I"),
            ("Lecture 31", "tzoYhe3H5dM"), ("Lecture 32", "sr7kCpzAuYw"), ("Lecture 33", "BChhAS1sFvA"),
            ("Lecture 34", "ZwpwmGP5ITM"), ("Lecture 35", "24v9onS9Kcg"),
        ])
    ],
    "CS103": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction and Proofs", "L3LMbpZIKhQ"), ("Induction", "z8HKWUWS-lA"),
            ("Strong Induction", "NuGDkmwEObM"), ("Number Theory I", "NuY7szYSXSw"),
            ("Number Theory II", "XX7ePR21Ook"), ("Graph Theory and Coloring", "h9wxtqoa1jY"),
            ("Matching Problems", "5RSMLgy06Ew"), ("Graph Theory II: Minimum Spanning Trees", "GJpt_3ie4WU"),
            ("Communication Networks", "bTyxpoi2dmM"), ("Graph Theory III", "DOIp5D7VMS4"),
            ("Relations, Partial Orders, and Scheduling", "1nScXLQAQ9A"), ("Sums", "fAeShezAGLE"),
            ("Sums and Asymptotics", "X9eErxRjQEI"), ("Divide and Conquer Recurrences", "Kqf0uO0oV6s"),
            ("Linear Recurrences", "TWBB-JlmYUc"), ("Counting Rules I", "pNt5Ll6hGqo"),
            ("Counting Rules II", "09yIb3VHhMI"), ("Probability Introduction", "SmFwFdESMHI"),
            ("Conditional Probability", "E6FbvM-FGZ8"), ("Independence", "l1BCv3qqW4A"),
            ("Random Variables", "MOfhhFaQdjw"), ("Expectation I", "gGlMSe7uEkA"),
            ("Expectation II", "oI9fMUqgfxY"), ("Large Deviations", "q4mwO2qS2z4"),
            ("Random Walks", "56iFMY8QW2k"),
        ])
    ],
    "CS109": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Counting", "2MuDZIAzBMY"), ("Combinatorics", "ag4Ei15CG0c"),
            ("What is Probability?", "EGgMCE2AgyU"), ("Conditional Probability and Bayes", "NHRoXvPaZqY"),
            ("Independence", "zTJDZ2wmaRU"), ("Random Variables and Expectation", "8QCg2ur-3fo"),
            ("Variance, Bernoulli, Binomial", "I2UBspTNAG0"), ("Poisson", "QV3IRiG6dVs"),
            ("Continuous Random Variables", "OFgBn4rQkqc"), ("Normal Distribution", "rpB_NNXiWlM"),
            ("Joint Distributions", "8Il2M7kbQSc"), ("Inference I", "d0ImA7m4BEg"),
            ("Inference II", "d0ImA7m4BEg"), ("Modelling", "q9lk8l8P-E4"),
            ("General Inference", "c0QGjtu9GZg"), ("Beta", "aOhk9mFrHdU"),
            ("Adding Random Variables", "UEyHbI9FRtM"), ("Central Limit Theorem", "6Q9wT6JGMMM"),
            ("Bootstrapping and P-Values", "NXJwyPT1vsc"), ("Algorithmic Analysis", "Ht9yUPtppwY"),
            ("M.L.E.", "utFEufMXHgw"), ("M.A.P.", "sL1zOr-P4xc"),
            ("Naive Bayes", "yqF3DvDVpvw"), ("Logistic Regression", "ILqZWvDWKEc"),
            ("Deep Learning", "MSfI6TTgyl4"), ("Fairness", "cbzwbr5H_LA"),
            ("Advanced Probability", "BxQw4CdxLr8"), ("Future of Probability", "SoXygq5LtiM"),
            ("Counting (Review)", "yyKSsjRt42o"),
        ])
    ],
    "PHYS41": [
        {"lecture": i+1, "title": f"Lecture {i+1}", "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, vid in enumerate([
            "5ucfHd8FWKw","i4u7SZjoAs4","ErlP_SBcA1s","xZn4l1TSvPQ","Q3v_2znHCvg","5zXYEVWSIsg","yLb_a1EE888","89SjJv30kGU","NiCMMn12CIs","IV9NhNIrrDw","RBaBEjzMr4E","sffRo1-_D8E","7WDiK3flILc","dlJtUvRaGdE","uo86ir31pn0","emrHcqEvXpw","_0PrwAbgoMA","tniGFmPQc0E","gEX7MjWwocE","bX4liSWB4Gk","vkWY73HnNYA","0mGd0JUmgm8","FNOfxJxceIM","9NS0JcjNdp4","30Ww1HsRblM","n1cXiw3s72k","1GvCIlHihEA","Vg8t8_IOHDg","ol1COj0LACs","D2lW7o32fzk","sN-m5WkbMyI","YGR5_Hf9dDg","dvWKCH0ocu8","7Kq8BINVDiw","bHocXJ4rv5g","0qEIs6ie2q8","efpiHD_2O8E","2TZa151GC-0","fLuyZ7ayDog","Lpd_TddOSZY","EX0uHJbIw68","nCDOa63Jd6M","z5JfWSocZUQ","EHCACV8rdig","MoRip5VVdkI","YLDRzy8Dcgo","6-7BOpZ2k04","-M8swpL-Ij8","efH7pq9YVQw","0QF_uCgZW4Y","X9K8LT7SCZ0","O_M8asN10oQ","IWD-Aue6aIk","6h3T3qIkxqw","Idx3VgOpUDk","mHVnpuhfpvI","DSk8HTcB7x0","EhgF2OViDDs","oILq3xz_XtU","hxa6jAYA980","ZMa-xKcM2L8","ThP6wQkf5ec"
        ])
    ],
    "PHYS43": [
        {"lecture": i+1, "title": t, "videos": [{"title": t, "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction", "rtlJoXxlSFE"),
            ("Electric Charges and Forces - Coulomb's Law - Polarization", "x1-SibwIPM4"),
            ("Electric Field Lines, Superposition, Inductive Charging, Dipoles", "Pd9HY8iLiCA"),
            ("Electric Flux, Gauss' Law, Examples", "Zu2gomaDqnM"),
            ("Electrostatic Potential, Electric Energy, Equipotential Surfaces", "QpVxj3XrLgk"),
            ("E = -grad V, Conductors, Electrostatic Shielding (Faraday Cage)", "JhV-GOS4y8g"),
            ("High-voltage Breakdown, Lightning, Sparks, St. Elmo's Fire", "ww0XJUqFHXU"),
            ("Capacitance, Electric Field Energy", "qyP1xZCB62E"),
            ("Polarization, Dielectrics, Van de Graaff Generator, Capacitors", "GAtAG938AQc"),
            ("Electric Currents, Resistivity, Conductivity, Ohm's Law", "PJqOaHBgr30"),
            ("Batteries, Power, Kirchhoff's Rules, Circuits, Kelvin Water Dropper", "ViwSDL657L4"),
            ("Magnetic Fields, Lorentz Force, Torques, Electric Motors (DC)", "0y9x7CS5Vrk"),
            ("First Exam Review", "08WJDvgr2Zc"),
            ("Moving Charges in B-fields, Cyclotrons, Mass Spectrometers, LHC", "sDnG1JhZ2N4"),
            ("Biot-Savart, div B = 0, High-voltage Power Lines, Leyden Jar", "By2ogrSwgVo"),
            ("Ampere's Law, Solenoids, Kelvin Water Dropper (revisited)", "MXuZ1SRjpqk"),
            ("Electromagnetic Induction, Faraday's Law, Lenz Law, SUPER DEMO", "nGQbA2jwkWI"),
            ("Motional EMF, Dynamos, Eddy Currents, Magnetic Breaking", "MzAPu_p2wI4"),
            ("Displacement Current, Synchronous Motors, Explanation Secret Top", "3sP9kh4xtKo"),
            ("Magnetic Levitation, Human Heart, Superconductivity, Aurora Borealis", "rLZLa-fyt1w"),
            ("Inductance, RL Circuits, Magnetic Field Energy", "t2micky_3uI"),
            ("Magnetic Materials, Dia- Para- & Ferromagnetism", "1xFRtdN5IJA"),
            ("Maxwell's Equations - 600 Daffodil Ceremony", "ckUyN5XNG0Y"),
            ("Second Exam Review", "KrXbnIohemY"),
            ("Transformers, Car Coils, RC Circuits", "6w3SzI_s5Sg"),
            ("Driven LRC Circuits, Metal Detectors", "FWMhk6x785Q"),
            ("Traveling Waves, Standing Waves, Musical Instruments", "D_RIzl1uCxY"),
            ("Destructive Resonance, Electromagnetic Waves, Speed of Light", "D3tnZzhSISo"),
            ("Poynting Vector, Oscillating Charges, Polarization, Radiation Pressure", "6lb040GCs2M"),
            ("Snell's Law, Index of Refraction, Huygen's Principle, Color", "irpjwXpa4xU"),
            ("Polarizers, Malus' Law, Light Scattering, Blue Skies, Red Sunsets", "ESAPg7w3wm8"),
            ("Rainbows, Fog Bows, Haloes, Glories, Sun Dogs", "pj0wXRLXai8"),
            ("Third Exam Review", "94dV7ucEEkY"),
            ("Double-slit Interference, Interferometers", "1rYF72PXVks"),
            ("Diffraction, Gratings, Resolving Power, Angular Resolution", "sKO8n_-xtDc"),
            ("Doppler Effect, Big Bang, Cosmology", "tDC2UDhRGkA"),
            ("Farewell Special - My Early Days in Astrophysics, Huge Balloons", "lFTUtK6xBCU"),
            ("Kirchhoff's Loop Rule Is For The Birds (Bonus)", "LzT_YZ0xCFY"),
        ])
    ],
    "BIO": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction", "lm8ywGl9AIQ"), ("Biochemistry I", "RJf9jRf-Ekw"),
            ("Biochemistry II", "3zJI3dYB7gc"), ("Biochemistry III", "6BPDK1b3jDg"),
            ("Biochemistry IV", "7aNYj3zyVkc"), ("Biochemistry V", "SGHx6jKvxr8"),
            ("Biochemistry VI", "R3DI6W9iKtU"), ("Biochemistry VI (cont.) - DNA as Genetic Material", "7ZlzvS7YoSM"),
            ("Molecular Biology I", "mJhgkUWLtX8"), ("Molecular Biology II - Process of Science", "Ncszdp4YQDY"),
            ("Molecular Biology III", "Uf7qNWklQkE"), ("Molecular Biology IV", "40Sum5KfG1Q"),
            ("Molecular Biology IV (cont.) - Gene Regulation I", "BhS5s1T1as8"),
            ("Gene Regulation II", "vES9nISxtjk"), ("Bacterial Genetics", "uQRTFmC5_GA"),
            ("The Biosphere", "gaHQ_1Sp5_s"), ("Carbon and Energy Metabolism", "5WqgNOSoD_M"),
            ("Productivity and Food Webs", "hWdAt9SzP0I"), ("Regulation of Productivity", "4owydSnRHuE"),
            ("Limiting Factors and Biogeochemical Cycles", "zIXGgyOwtUk"),
            ("Mendelian Genetics", "eiDX9dw866E"), ("Mitosis and Meiosis", "g6VEnimixRk"),
            ("Diploid Genetics", "fQKMD2iFe5w"), ("Recombinant DNA I", "l5x9qAVUK7s"),
            ("Recombinant DNA II", "EO9SMD6fIsI"), ("Recombinant DNA III", "5W4EnYzNRdA"),
            ("Recombinant DNA III (cont.) - Immunology I", "kAN_eTW_ig0"),
            ("Immunology II", "Y8eEMYqkwz0"), ("Population Growth I", "Yr-cZg9eqp4"),
            ("Population Growth II", "rKquepVheyM"), ("Population Genetics and Evolution", "LBR4pEC7kwU"),
            ("Molecular Evolution", "ONYokXoy04Q"), ("Communities I", "GAArnLLlFtQ"),
            ("Communities II", "5_QWoGFUPaI"),
        ])
    ],
    "CHEM": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("The Importance of Chemical Principles", "YkYeYhXUeEE"),
            ("Atomic Structure", "ustfXi-mpkI"), ("Wave-Particle Duality of Light", "_U6YamvF7BE"),
            ("Wave-Particle Duality of Matter; Schrödinger Equation", "Qg7pQ_CYaIQ"),
            ("Hydrogen Atom Energy Levels", "kO0VmaLkgj8"), ("Hydrogen Atom Wavefunctions (Orbitals)", "V-RPM3e8Ws0"),
            ("Multielectron Atoms", "-jJz5OMmuP0"), ("The Periodic Table and Periodic Trends", "LWmVdG0uj2g"),
            ("Periodic Table; Ionic and Covalent Bonds", "NIZFPnHtrBA"),
            ("Introduction to Lewis Structures", "ed_XR1BzuQs"),
            ("Lewis Structures: Breakdown of the Octet Rule", "Hc5ODj1Ml6c"),
            ("The Shapes of Molecules: VSEPR Theory", "Ja9eEQQzTic"),
            ("Molecular Orbital Theory", "O192jrR80oo"), ("Valence Bond Theory and Hybridization", "BBbuj0XpaiQ"),
            ("Thermodynamics: Bond and Reaction Enthalpies", "wS1MX-C2V9w"),
            ("Thermodynamics: Gibbs Free Energy and Entropy", "OjhZYx1FbhI"),
            ("Thermodynamics: Now What Happens When You Heat It Up?", "awdQqF9CFt0"),
            ("Introduction to Chemical Equilibrium", "f0udxGcoztE"),
            ("Chemical Equilibrium: Le Châtelier's Principle", "AVL5AwJrrEU"),
            ("Solubility and Acid-Base Equilibrium", "FJCVSswFXyE"),
            ("Acid-Base Equilibrium: Is MIT Water Safe to Drink?", "pJdUR2uak2s"),
            ("Acid-Base Equilibrium: Salt Solutions and Buffers", "caonmXHGB60"),
            ("Acid-Base Titrations Part I", "pIwp65fPyYU"), ("Acid-Base Titrations Part II", "Om_5b29d_9g"),
            ("Oxidation-Reduction and Electrochemical Cells", "BZzkyqe6KD8"),
            ("Chemical and Biological Oxidations", "f6Z99Gu6XEE"),
            ("Introduction to Transition Metals", "JBgbUI3pxV0"),
            ("Transition Metals: Crystal Field Theory Part I", "lLdPSLNxDqA"),
            ("Transition Metals: Crystal Field Theory Part II", "CFPnZ66nge4"),
            ("Kinetics: Rate Laws", "B7iFcW8USjQ"), ("Nuclear Chemistry and Chemical Kinetics", "XKeAd4xybjM"),
            ("Kinetics: Reaction Mechanisms", "4q0T9c7jotw"), ("Kinetics and Temperature", "KHkNrbSKFic"),
            ("Kinetics: Catalysts", "p8AAjZXr5dg"), ("Applying Chemical Principles", "pn1cxuBmhtI"),
        ])
    ],
    "CS107": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "internet_archive", "archive_id": aid}]}
        for i, (t, aid) in enumerate([
            ("Course Introduction", "ucberkeley_webcast_gJJeUFyuvvg"),
            ("Intro to the C Programming Language, Part I", "ucberkeley_webcast_mZgoX-yLqxM"),
            ("Intro to the C Programming Language, Part II", "ucberkeley_webcast_DJa1tBk6gPM"),
            ("Intro to the C Programming Language, Part III", "ucberkeley_webcast_7WTass69OYM"),
            ("Intro to Assembly Language, MIPS Intro", "ucberkeley_webcast_zUYCZYKaUrk"),
            ("MIPS, MIPS Functions", "ucberkeley_webcast_DEqOkfYhDS4"),
            ("MIPS Instruction Formats", "ucberkeley_webcast_tjjWdaDiXio"),
            ("Running a Program (Compiling, Assembling, Linking, Loading)", "ucberkeley_webcast_Z4r9AWu8D18"),
            ("Synchronous Digital Systems", "ucberkeley_webcast_SstCrz0xUzw"),
            ("Finite State Machines, Functional Units", "ucberkeley_webcast__MOzj6gXrU0"),
            ("Single-Cycle CPU Datapath & Control, Part 1", "ucberkeley_webcast_OOBwKAXZjlk"),
            ("Single-Cycle CPU Datapath & Control, Part 2", "ucberkeley_webcast_ZnxKHKVvQl4"),
            ("Pipelining", "ucberkeley_webcast_oIawE3IseRA"),
            ("Caches Part 1", "ucberkeley_webcast_XeOftiVV49o"),
            ("Caches Part 2", "ucberkeley_webcast_ERtmeRRES5U"),
            ("Caches Part 3", "ucberkeley_webcast_N4bfyyVEPRc"),
            ("Performance and Floating Point Arithmetic", "ucberkeley_webcast_z8rFDWFDj8c"),
            ("Amdahl's Law and Data-Level Parallelism", "ucberkeley_webcast_xNJyfcv7YsQ"),
            ("Thread Level Parallelism (TLP) and OpenMP Intro", "ucberkeley_webcast_OrrIbXqfu4U"),
            ("Thread Level Parallelism (TLP) and OpenMP", "ucberkeley_webcast_1o6078uavdo"),
            ("Warehouse-Scale Computing, MapReduce, and Spark", "ucberkeley_webcast_BDdvnVOWkSE"),
            ("Operating Systems, Interrupts, Virtual Memory Intro", "ucberkeley_webcast_9X3Tioo3deA"),
            ("Virtual Memory, Intro to I/O", "ucberkeley_webcast__bW31WWiQbo"),
            ("More I/O: DMA, Disks, Networking", "ucberkeley_webcast_QhFnRQ2pJyw"),
            ("Dependability and RAID", "ucberkeley_webcast_2hAJwG9G9PE"),
            ("Course Summary", "ucberkeley_webcast_kpjywuTwpMc"),
        ])
    ],
    "CS110": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Course Introduction", "_LFGjZ0Sc6I"), ("File Systems - Fundamentals", "Dbg2N7T6D_c"),
            ("Unix v6 Filesystem Architecture", "vUyKpzg6vYk"),
            ("Filesystem Data Structures, System Calls, Intro to Multiprocessing", "DSPc5LIVWHw"),
            ("execvp System Call - Introduction", "RDk_CY0HT_E"),
            ("execvp, pipe, dup2, and Signals", "Yf380zTr_ro"),
            ("Signals - Deep Dive", "d9Pou4L7j0s"),
            ("Race Conditions, Deadlock, and Data Integrity", "YE4MW01u7mg"),
            ("Introduction to Threads", "bw68rvYNG8k"),
            ("From C Threads to C++ Threads", "lyODXaZ2Zg8"),
            ("Multithreading, Condition Variables, and Semaphores", "7U3Eo0ynmHo"),
            ("Review: mutex, condition_variable_any, semaphore", "l4PrC3mCPJY"),
            ("Ice Cream Shop Simulation - Concurrency Patterns", "rA4iG8eYzi4"),
            ("Introduction to Networking", "oLvSC6TCqdI"),
            ("Networks and Clients - Socket Programming", "akQOgmL2a-8"),
            ("Network System Calls", "eTKrkFAg6WI"),
            ("Web Proxy Implementation", "wqI_BRyB2tM"),
            ("MapReduce - Distributed Computing Fundamentals", "y-MDGT5-OAY"),
            ("Principles of System Design", "L3w6NE3_sCA"),
            ("Course Wrap-up and Advanced Topics", "y5xvYX0m61E"),
        ])
    ],
    "CS161": [
        {"lecture": i+1, "title": topic_title, "videos": videos}
        for i, (topic_title, videos) in enumerate([
            ("Introduction & Asymptotic Analysis", [
                {"title": "Lecture 1 - Introduction", "type": "youtube", "id": "yRM3sc57q0c"},
                {"title": "Lecture 2 - Big-O Notation", "type": "youtube", "id": "QfRSeibcugw"},
                {"title": "Lecture 3 - Asymptotic Analysis Examples", "type": "youtube", "id": "5rZCkblZFZM"},
            ]),
            ("Divide and Conquer", [
                {"title": "Lecture 4 - MergeSort: Motivation and Example", "type": "youtube", "id": "kiyRJ7GVWro"},
                {"title": "Lecture 5 - MergeSort: Pseudocode", "type": "youtube", "id": "rBd5w0rQaFo"},
                {"title": "Lecture 6 - MergeSort: Analysis", "type": "youtube", "id": "8ArtRiTkYEw"},
                {"title": "Lecture 7 - Karatsuba Multiplication", "type": "youtube", "id": "JCbZayFr9RE"},
            ]),
            ("Master Method & Recurrences", [
                {"title": "Lecture 8 - Master Method: Motivation", "type": "youtube", "id": "6dGDcszz2DM"},
                {"title": "Lecture 9 - Master Method: Formal Statement", "type": "youtube", "id": "rXiojCN9nIs"},
                {"title": "Lecture 10 - Master Method: Six Examples", "type": "youtube", "id": "4l1MvY7iGhs"},
                {"title": "Lecture 11 - Proof of the Master Method", "type": "youtube", "id": "6BVNhKm0vpE"},
            ]),
            ("Sorting & QuickSort", [
                {"title": "Lecture 12 - QuickSort: Overview", "type": "youtube", "id": "ETo1cpLN7kk"},
                {"title": "Lecture 13 - Partitioning Around a Pivot", "type": "youtube", "id": "LYzdRN5iFdA"},
                {"title": "Lecture 14 - Choosing a Good Pivot", "type": "youtube", "id": "kqO46FOUTbI"},
                {"title": "Lecture 15 - QuickSort Analysis", "type": "youtube", "id": "sToWtKSYlMw"},
                {"title": "Lecture 16 - Sorting Lower Bound", "type": "youtube", "id": "aFveIyII5D4"},
            ]),
            ("Randomized Algorithms & Linear-Time Selection", [
                {"title": "Lecture 17 - Randomized Linear-Time Selection", "type": "youtube", "id": "nFw6x7DoYbs"},
                {"title": "Lecture 18 - Randomized Selection: Analysis", "type": "youtube", "id": "rX2u2CnpveQ"},
                {"title": "Lecture 19 - Deterministic Linear-Time Selection", "type": "youtube", "id": "L5-4cPW5HoU"},
                {"title": "Lecture 20 - Deterministic Selection: Analysis", "type": "youtube", "id": "6ntwpZmHN-g"},
            ]),
            ("Graphs & Graph Search", [
                {"title": "Lecture 21 - Graphs: The Basics", "type": "youtube", "id": "4Ih3UhVuEtw"},
                {"title": "Lecture 22 - Graph Representations", "type": "youtube", "id": "b-Mfu8dPv9U"},
                {"title": "Lecture 23 - Graph Search Overview", "type": "youtube", "id": "SW6jwg7WS48"},
                {"title": "Lecture 24 - Breadth-First Search", "type": "youtube", "id": "73qCvXsYkfk"},
                {"title": "Lecture 25 - Depth-First Search", "type": "youtube", "id": "_9_VUNrWGUs"},
                {"title": "Lecture 26 - Topological Sort", "type": "youtube", "id": "ozso3xxkVGU"},
            ]),
            ("Strongly Connected Components", [
                {"title": "Lecture 27 - Computing SCCs (Part 1)", "type": "youtube", "id": "O98hLTYVN3c"},
                {"title": "Lecture 28 - Computing SCCs (Part 2)", "type": "youtube", "id": "gbs3UNRJIYk"},
                {"title": "Lecture 29 - Structure of the Web", "type": "youtube", "id": "7YodysGShlo"},
            ]),
            ("Shortest Paths & Dijkstra's Algorithm", [
                {"title": "Lecture 30 - Shortest Paths & Dijkstra's Algorithm", "type": "youtube", "id": "jRlNVmRjdRk"},
                {"title": "Lecture 31 - Dijkstra's Algorithm: Examples", "type": "youtube", "id": "ahYhIzLklYo"},
                {"title": "Lecture 32 - Correctness of Dijkstra's Algorithm", "type": "youtube", "id": "sb7j3EW055M"},
                {"title": "Lecture 33 - Implementation with Heaps", "type": "youtube", "id": "00LtSn_PQjc"},
            ]),
            ("Data Structures: Heaps, BSTs & Hash Tables", [
                {"title": "Lecture 34 - Heaps: Operations and Applications", "type": "youtube", "id": "mNYHDv7SbDI"},
                {"title": "Lecture 35 - Heaps: Implementation Details", "type": "youtube", "id": "6VI5kJu8Mv4"},
                {"title": "Lecture 36 - Balanced Search Trees", "type": "youtube", "id": "IbNZ-x1I2IM"},
                {"title": "Lecture 37 - Rotations", "type": "youtube", "id": "CZkBqasoH8c"},
                {"title": "Lecture 38 - Hash Tables: Operations & Applications", "type": "youtube", "id": "Qu183GFHbZQ"},
                {"title": "Lecture 39 - Hash Tables: Implementation", "type": "youtube", "id": "j5KkC-wjlK4"},
                {"title": "Lecture 40 - Bloom Filters", "type": "youtube", "id": "zYlxP7F3Z3c"},
            ]),
            ("Greedy Algorithms & Minimum Spanning Trees", [
                {"title": "Lecture 41 - Introduction to Greedy Algorithms", "type": "youtube", "id": "NTFmxA3qgoo"},
                {"title": "Lecture 42 - Minimum Spanning Trees: Problem Definition", "type": "youtube", "id": "tDj9BkaQDO8"},
                {"title": "Lecture 43 - Prim's MST Algorithm", "type": "youtube", "id": "jsvOPssDVJA"},
                {"title": "Lecture 44 - Kruskal's MST Algorithm", "type": "youtube", "id": "SZuCspj5AJc"},
                {"title": "Lecture 45 - Huffman Codes", "type": "youtube", "id": "NM6FZB7IfS8"},
                {"title": "Lecture 46 - Single-Link Clustering", "type": "youtube", "id": "MSSzOs1X4K8"},
            ]),
        ])
    ],
    "CS294": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("August 23, 2017", "Q4kF8sfggoI"), ("August 28, 2017", "C_LGsoe36I8"),
            ("August 30, 2017", "PTbxa6GsTWc"), ("September 6, 2017", "tWNpiNzWuO8"),
            ("September 11, 2017", "PpVhtJn-iZI"), ("September 13, 2017", "k1vNh4rNYec"),
            ("September 18, 2017", "nZXC5OdDfs4"), ("September 20, 2017", "EfgC7v5V608"),
            ("September 25, 2017", "yap_g0d7iBQ"), ("September 27, 2017", "AwdauFLan7M"),
            ("October 2, 2017", "vRkIwM4GktE"), ("October 4, 2017", "iOYiPhu5GEk"),
            ("October 9, 2017", "-3BcZwgmZLk"), ("October 11, 2017", "ycCtmp4hcUs"),
            ("October 16, 2017", "npi6B4VQ-7s"), ("October 18, 2017", "0WbVUvKJpg4"),
            ("October 23, 2017", "UqSx23W9RYE"), ("October 25, 2017", "Xe9bktyYB34"),
            ("October 30, 2017", "mc-DtbhhiKA"), ("November 1, 2017", "j9QI21xtqV4"),
            ("November 6, 2017", "QJpc_T65QRY"), ("November 8, 2017", "CHKSBEx_k54"),
            ("November 15, 2017", "ixtEeS6aCKU"), ("November 20, 2017", "gqX8J38tESw"),
        ])
    ],
    "ENGR40M": [
        {"lecture": i+1, "title": t, "videos": vids}
        for i, (t, vids) in enumerate([
            ("Introduction and Lumped Abstraction", [{"title": "Lecture 1", "type": "youtube", "id": "AfQxyVuLeCs"}]),
            ("Basic Circuit Analysis Method", [{"title": "Lecture 2", "type": "youtube", "id": "2vHGYdepKLw"}]),
            ("Superposition, Thévenin and Norton", [{"title": "Lecture 3", "type": "youtube", "id": "RsJ1eg7XNVs"}]),
            ("The Digital Abstraction", [{"title": "Lecture 4", "type": "youtube", "id": "4TCnYYpZxEc"}]),
            ("Inside the Digital Gate", [{"title": "Lecture 5", "type": "youtube", "id": "v6vqWasIHaw"}]),
            ("Nonlinear Analysis", [{"title": "Lecture 6", "type": "youtube", "id": "OGtElTMJidE"}]),
            ("Incremental Analysis", [{"title": "Lecture 7", "type": "youtube", "id": "JqvKtMNz3RQ"}]),
            ("Dependent Sources and Amplifiers", [{"title": "Lecture 8", "type": "youtube", "id": "bEJ0-8pANA9"}]),
            ("MOSFET Amplifier Large Signal", [{"title": "Part 1", "type": "youtube", "id": "Nijya-QJ45Y"}, {"title": "Part 2", "type": "youtube", "id": "jURSAKBlIZA"}]),
            ("Amplifiers - Small Signal Model", [{"title": "Lecture 10", "type": "youtube", "id": "9RqFFlZgf60"}]),
            ("Small Signal Circuits", [{"title": "Lecture 11", "type": "youtube", "id": "R4KxlqsuZ0A"}]),
            ("Capacitors and First-Order Systems", [{"title": "Lecture 12", "type": "youtube", "id": "COdQmA9g9S8"}]),
            ("Digital Circuit Speed", [{"title": "Lecture 13", "type": "youtube", "id": "TXJIhDHtHSI"}]),
            ("State and Memory", [{"title": "Lecture 14", "type": "youtube", "id": "bX8i2yECWaU"}]),
            ("Second-Order Systems", [{"title": "Part 1", "type": "youtube", "id": "ypX20WnHNQw"}, {"title": "Part 2", "type": "youtube", "id": "-gRXU-O1FY4"}]),
            ("Sinusoidal Steady State", [{"title": "Lecture 16", "type": "youtube", "id": "3GdMaDzIUeQ"}]),
            ("The Impedance Model", [{"title": "Lecture 17", "type": "youtube", "id": "Km9YIdkc2Oo"}]),
            ("Filters", [{"title": "Lecture 18", "type": "youtube", "id": "WT-qzgaKeGI"}]),
            ("The Operational Amplifier Abstraction", [{"title": "Lecture 19", "type": "youtube", "id": "V0z_f7qxLcY"}]),
            ("Operational Amplifier Circuits", [{"title": "Lecture 20", "type": "youtube", "id": "2SwT6JnfCq8"}]),
            ("Op Amps Positive Feedback", [{"title": "Lecture 21", "type": "youtube", "id": "ke3SL_R92ys"}]),
            ("Energy and Power", [{"title": "Lecture 22", "type": "youtube", "id": "wNuBD4PYWvs"}]),
            ("Energy, CMOS", [{"title": "Lecture 23", "type": "youtube", "id": "JB2HgohNHYQ"}]),
            ("Violating the Abstraction Barrier", [{"title": "Lecture 25", "type": "youtube", "id": "dyxcCoUgETU"}]),
        ])
    ],
    "ENGR76": [
        {"lecture": i+1, "title": t, "videos": [{"title": t, "type": "bilibili", "bvid": "BV1g64y1M7zR", "page": i+1}]}
        for i, t in enumerate([
            "Bits and Codes", "Compression", "Noise and Errors", "Probability 1", "Probability 2",
            "Communications 1", "Communications 2", "Processes", "Inference 1", "Inference 2",
            "Maximum Entropy 1", "Maximum Entropy 2", "Physical Systems", "Energy 1", "Energy 2",
            "Temperature 1", "Temperature 2", "Quantum Information",
        ])
    ],
    "EE102": [
        {"lecture": i+1, "title": f"Lecture {num}", "videos": [{"title": f"Lecture {num}", "type": "youtube", "id": vid}]}
        for i, (num, vid) in enumerate([
            (1,"9gPuUVYImiQ"),(2,"IVGPGQ8WRoo"),(3,"dBu6dSWXeGk"),(4,"re7NLEqYjHA"),(5,"b8Xz9CRJ-es"),
            (7,"ymr7950ygdM"),(9,"88mup0b5c0U"),(10,"I3DZM0rarTA"),(11,"moAzNZo4bAE"),(12,"TlFmw0kjQ3c"),
            (13,"b7MGTr1R_Sk"),(14,"TutXtjvzgh0"),(16,"f3PbDgLOIpk"),(17,"-nDH8aSWaUM"),(18,"mtOf7vYK8YU"),
            (19,"XANTFFndQRY"),(20,"NBIFWCbfZQ4"),(23,"A90nje5JJuA"),(24,"csL9VxDHPMg"),(25,"QZEmtRdf6ww"),(26,"GKYFFofkELA"),
        ])
    ],
    "CS221": [
        {"lecture": i+1, "title": t, "videos": vids}
        for i, (t, vids) in enumerate([
            ("Intro & Course Overview", [{"title": "General Intro", "type": "youtube", "id": "ZiwogMtbjr4"}, {"title": "AI History", "type": "youtube", "id": "z8fEXuH0mu0"}]),
            ("AI Today & Linear Models", [{"title": "Artificial Intelligence Today", "type": "youtube", "id": "C0IhR4D5KYc"}, {"title": "AI & ML 1 - Overview", "type": "youtube", "id": "mtrYwgIrRNk"}, {"title": "AI & ML 2 - Linear Regression", "type": "youtube", "id": "nEWNNt2KmfQ"}]),
            ("ML: Classification & SGD", [{"title": "Linear Classification", "type": "youtube", "id": "WcaMiqJR09s"}, {"title": "Stochastic Gradient Descent", "type": "youtube", "id": "bl2WgBLH0tI"}, {"title": "Group DRO", "type": "youtube", "id": "ZFK2XtWqUbw"}]),
            ("ML: Features & Neural Networks", [{"title": "Non Linear Features", "type": "youtube", "id": "eIxbNkB4byY"}, {"title": "Feature Templates", "type": "youtube", "id": "2QfSBLtvioE"}, {"title": "Neural Networks", "type": "youtube", "id": "pnKXgBHuN58"}, {"title": "Backpropagation", "type": "youtube", "id": "OcAF-l2xB9Y"}]),
            ("ML: Differentiable Programming & Generalization", [{"title": "Differentiable Programming", "type": "youtube", "id": "c5btEEisp_g"}, {"title": "Generalization", "type": "youtube", "id": "Gq-Ah-QrOQM"}, {"title": "Best Practices", "type": "youtube", "id": "ouvGV2YZEEM"}]),
            ("ML: K-means & Search", [{"title": "K-means", "type": "youtube", "id": "5-Fn8R9fH7A"}, {"title": "Dynamic Programming, Uniform Cost Search", "type": "youtube", "id": "aIsgJJYrlXk"}, {"title": "A*", "type": "youtube", "id": "HEs1ZCvLH2s"}]),
            ("Markov Decision Processes", [{"title": "Value Iteration", "type": "youtube", "id": "9g32v7bK3Co"}, {"title": "Reinforcement Learning", "type": "youtube", "id": "HpaHTfY52RQ"}]),
            ("Game Playing", [{"title": "Minimax, Alpha-beta Pruning", "type": "youtube", "id": "3pU-Hrz_xy4"}, {"title": "TD Learning, Game Theory", "type": "youtube", "id": "WoFwXj4p4Sc"}]),
            ("Constraint Satisfaction Problems", [{"title": "Overview", "type": "youtube", "id": "-IO4fPO0rxk"}, {"title": "Definitions", "type": "youtube", "id": "uj5wCcHsSlA"}, {"title": "Examples", "type": "youtube", "id": "Tu6BiZhMDCc"}, {"title": "Dynamic Ordering", "type": "youtube", "id": "Lyu8VzbIe_A"}, {"title": "Arc Consistency", "type": "youtube", "id": "5rlIYGJdPy4"}, {"title": "Beam Search", "type": "youtube", "id": "XuWMeIHGkus"}, {"title": "Local Search", "type": "youtube", "id": "VwZKPlK6jUg"}]),
            ("Markov & Bayesian Networks", [{"title": "Markov Networks Overview", "type": "youtube", "id": "neeaJb3wCYw"}, {"title": "Gibbs Sampling", "type": "youtube", "id": "k6aZZF2pk7k"}, {"title": "Bayesian Networks Overview", "type": "youtube", "id": "fA7zP6EcVdw"}, {"title": "Bayesian Networks Definition", "type": "youtube", "id": "xvC6XmZmR_U"}]),
            ("Bayesian Networks: Programming & Inference", [{"title": "Probabilistic Programming", "type": "youtube", "id": "ZVk8y1zVoD4"}, {"title": "Probabilistic Inference", "type": "youtube", "id": "-dGOWB9Zh8s"}, {"title": "Forward-backward Algorithm", "type": "youtube", "id": "N-ZPbpJOQs0"}, {"title": "Particle Filtering", "type": "youtube", "id": "8sOtXbQIOuE"}]),
            ("Bayesian Networks: Learning", [{"title": "Supervised Learning", "type": "youtube", "id": "_rbDjsJTgm8"}, {"title": "Smoothing", "type": "youtube", "id": "M7rWvN_0xbw"}, {"title": "EM Algorithm", "type": "youtube", "id": "CPVFJBd-Qcg"}]),
            ("Logic", [{"title": "Overview: Logic Based Models", "type": "youtube", "id": "oM5LUGPO7Zk"}, {"title": "Propositional Logic Syntax", "type": "youtube", "id": "LBjNaewGJzk"}, {"title": "Propositional Logic Semantics", "type": "youtube", "id": "N37yIn1jX98"}, {"title": "Inference Rules", "type": "youtube", "id": "RIk67yGMVv4"}, {"title": "Propositional Modus Ponens", "type": "youtube", "id": "6bj4z2mt1KE"}, {"title": "Propositional Resolutions", "type": "youtube", "id": "egLAF4dFdBo"}, {"title": "First Order Logic", "type": "youtube", "id": "Z-O0Q3_oTJM"}, {"title": "First Order Modus Ponens", "type": "youtube", "id": "mndzhfBpyUw"}, {"title": "First Order Resolution", "type": "youtube", "id": "iG_tz7ZjZAI"}, {"title": "Recap", "type": "youtube", "id": "LYsOjtmLpPo"}]),
            ("Special Topics & Fireside Talks", [{"title": "AI and Law", "type": "youtube", "id": "_-hBu3_Jz-0"}, {"title": "Robustness in ML", "type": "youtube", "id": "xr8AHGlieOE"}, {"title": "State of Robotics", "type": "youtube", "id": "hVsR9DdR3qE"}, {"title": "Inequality in Healthcare, AI & Data Science", "type": "youtube", "id": "0IZhDmh1dmI"}, {"title": "AI and Language", "type": "youtube", "id": "pI72PseZQo8"}]),
            ("Conclusion & AI Safety", [{"title": "General Conclusion", "type": "youtube", "id": "iUGmupxCdjs"}, {"title": "Externalities and Dual-Use Technologies", "type": "youtube", "id": "2xQLCXqOtdU"}, {"title": "The AI Alignment Problem", "type": "youtube", "id": "5WHObJWE1FE"}, {"title": "Encoding Human Values", "type": "youtube", "id": "aWAqgzXENr0"}, {"title": "Algorithms and Distribution", "type": "youtube", "id": "olhFrDHP7iU"}]),
        ])
    ],
    "CS229": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Course Introduction", "jGwO_UgTS7I"), ("Linear Regression & Gradient Descent", "4b4MUYve_U8"),
            ("Locally Weighted & Logistic Regression", "het9HFqo1TQ"),
            ("Perceptron & Generalized Linear Models", "iZTeva0WSTQ"),
            ("GDA & Naive Bayes", "nt63k3bfXS0"), ("Support Vector Machines", "lDwow4aOrtg"),
            ("Kernels", "8NYoQiRANpg"), ("Data Splits, Models & Cross-Validation", "rjbkWSTjHzM"),
            ("Learning Theory (Discussion Section)", "iVOxMcumR4A"),
            ("Decision Trees & Ensemble Methods", "wr9gUr-eWdA"),
            ("Introduction to Neural Networks", "MfIjxPh6Pys"),
            ("Backpropagation & Improving Neural Networks", "zUazLXZZA2U"),
            ("Debugging ML Models & Error Analysis", "ORrStCArmP4"),
            ("Expectation-Maximization Algorithms", "rVfZHWTwXSA"),
            ("EM Algorithm & Factor Analysis", "tw6cmL5STuY"), ("PCA & ICA", "dyb_cFywuik"),
            ("Independent Component Analysis & RL", "YQA9lLdLig8"),
            ("MDPs & Value/Policy Iteration", "d5gaWTo6kDM"),
            ("Continuous State MDP & Model Simulation", "QFu5nuc-S0s"),
            ("Reward Model & Linear Dynamical Systems", "0rt2CsEQv6U"),
            ("RL Debugging & Diagnostics", "pLhPQynL0tY"),
        ])
    ],
    "CS224N": [
        {"lecture": i+1, "title": t, "videos": vids}
        for i, (t, vids) in enumerate([
            ("Intro and Word Vectors", [{"title": "Lecture 1", "type": "youtube", "id": "DzpHeXVSC5I"}]),
            ("Word Vectors and Language Models", [{"title": "Lecture 2", "type": "youtube", "id": "nBor4jfWetQ"}]),
            ("Backpropagation, Neural Network", [{"title": "Lecture 3", "type": "youtube", "id": "HnliVHU2g9U"}]),
            ("Dependency Parsing", [{"title": "Lecture 4", "type": "youtube", "id": "KVKvde-_MYc"}]),
            ("Recurrent Neural Networks", [{"title": "Lecture 5", "type": "youtube", "id": "fyc0Jzr74y4"}]),
            ("Sequence to Sequence Models", [{"title": "Lecture 6", "type": "youtube", "id": "Ba6Fn1-Jsfw"}]),
            ("Attention, Final Projects and LLM Intro", [{"title": "Lecture 7", "type": "youtube", "id": "J7ruSOIzhrE"}]),
            ("Self-Attention and Transformers", [{"title": "Lecture 8", "type": "youtube", "id": "LWMzyfvuehA"}]),
            ("Pretraining", [{"title": "Lecture 9", "type": "youtube", "id": "DGfCRXuNA2w"}]),
            ("Natural Language Generation", [{"title": "Lecture 11 (2023)", "type": "youtube", "id": "N9L32bFieEY"}]),
            ("Post-training", [{"title": "Lecture 10 - Archit Sharma", "type": "youtube", "id": "35X6zlhoCy4"}]),
            ("Benchmarking", [{"title": "Lecture 11 - Yann Dubois", "type": "youtube", "id": "TO0CqzqiArM"}]),
            ("Efficient Training", [{"title": "Lecture 12 - Shikhar Murty", "type": "youtube", "id": "UVX7SYGCKkA"}]),
            ("Brain-Computer Interfaces", [{"title": "Lecture 13 - Chaofei Fan", "type": "youtube", "id": "tfVgHsKpRC8"}]),
            ("Reasoning and Agents", [{"title": "Lecture 14 - Shikhar Murty", "type": "youtube", "id": "I0tj4Y7xaOQ"}]),
            ("After DPO", [{"title": "Lecture 15 - Nathan Lambert", "type": "youtube", "id": "dnF463_Ar9I"}]),
            ("ConvNets and TreeRNNs", [{"title": "Lecture 16", "type": "youtube", "id": "S8d-7v3f5MQ"}]),
            ("NLP, Linguistics, Philosophy", [{"title": "Lecture 18", "type": "youtube", "id": "NxH0Y78xcF4"}]),
            ("Multimodal Deep Learning", [{"title": "Lecture 16 (2023) - Douwe Kiela", "type": "youtube", "id": "5vfIT5LOkR0"}]),
            ("Model Interpretability & Editing", [{"title": "Lec. 19 (2023) - Been Kim", "type": "youtube", "id": "cd3pRpEtjLs"}]),
            ("Python Tutorial", [{"title": "Python Tutorial", "type": "youtube", "id": "8j4wpU98Q74"}]),
            ("PyTorch Tutorial", [{"title": "PyTorch Tutorial", "type": "youtube", "id": "Uv0AIRr3ptg"}]),
            ("Hugging Face Tutorial", [{"title": "Hugging Face Tutorial", "type": "youtube", "id": "b80by3Xk_A8"}]),
        ])
    ],
    "CS140": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "mp4_url", "url": f"https://s3.us-west-1.wasabisys.com/oscourse/videos/lecture-{str(i+1).zfill(2)}-2022-{date}.mp4"}]}
        for i, (t, date) in enumerate([
            ("Introduction", "04-17"), ("OS: A Bird's-Eye View (Part 1)", "04-17"),
            ("OS: A Bird's-Eye View (Part 2)", "04-20"), ("OS: A Bird's-Eye View (Part 2)", "04-20"),
            ("Processes", "04-21"), ("Threads: An Instant Primer", "04-21"),
            ("Race Conditions", "04-24"), ("Semaphores: A First Cut", "04-24"),
            ("Semaphores: A First Cut", "04-27"), ("Threads and Context Switching in BLITZ", "04-27"),
            ("Monitors and Condition Variables", "04-28"), ("Monitors and Condition Variables", "04-28"),
            ("The Dining Philosophers", "05-04"), ("The Sleeping Barber", "05-04"),
            ("Threads: A Deep Dive", "05-05"), ("Threads: A Deep Dive", "05-05"),
            ("Context Switching: A Deep Dive", "05-08"), ("Context Switching: A Deep Dive", "05-08"),
            ("Scheduling Policies: Introduction", "05-11"), ("MLFQ Scheduling", "05-11"),
            ("Proportional Share Scheduling", "05-12"), ("Multiprocessor Scheduling", "05-12"),
            ("Virtualizing Memory: Introduction", "05-15"), ("Segmentation", "05-15"),
            ("Free Space Management", "05-18"), ("Paging: Introduction", "05-18"),
            ("Paging: Smaller Tables", "05-19"), ("Paging: Faster Translations", "05-19"),
            ("Beyond Physical Memory", "05-22"), ("Beyond Physical Memory", "05-22"),
            ("Beyond Physical Memory", "05-25"), ("Page Replacement", "05-25"),
            ("Page Replacement", "05-26"), ("Page Replacement", "05-26"),
            ("File System Implementation", "05-29"), ("File System Implementation", "05-29"),
            ("File System Implementation", "06-01"), ("Journaling File Systems", "06-01"),
            ("Journaling File Systems", "06-05"), ("Input/Output Devices", "06-05"),
            ("Virtual Machine Monitors", "06-08"), ("Security: An Introduction", "06-08"),
            ("Systems Security", "06-09"), ("Systems Security", "06-09"),
        ])
    ],
    "CS143": [
        {"lecture": i+1, "title": t, "videos": [{"title": t, "type": "bilibili", "bvid": "BV17K4y147Bz", "page": i+1}]}
        for i, t in enumerate([
            "Introduction", "Structure of a Compiler", "The Economy of Programming Languages",
            "Cool Overview", "Cool Example II", "Cool Example III", "Lexical Analysis",
            "Lexical Analysis Examples", "Regular Languages", "Formal Languages", "Lexical Specifications",
            "Lexical Specification (cont.)", "Finite Automata", "Regular Expressions into NFAs",
            "NFA to DFA", "Implementing Finite Automata", "Introduction to Parsing",
            "Context Free Grammars", "Derivations", "Ambiguity", "Error Handling",
            "Abstract Syntax Trees", "Recursive Descent Parsing", "Recursive Descent Algorithm",
            "Recursive Descent Limitations", "Left Recursion", "Predictive Parsing",
            "First Sets", "Follow Sets", "LL1 Parsing Tables", "Bottom-Up Parsing",
            "Shift-Reduce Parsing", "Handles", "Recognizing Handles", "Recognizing Viable Prefixes",
            "Valid Items", "SLR Parsing", "SLR Parsing Example", "SLR Improvements", "SLR Examples",
            "Implementing Type Checking", "Introduction to Semantic Analysis", "Scope",
            "Symbol Tables", "Types", "Type Checking", "Type Environments", "Subtyping",
            "Typing Methods", "Static vs. Dynamic Typing", "Self Type", "Self Type Operations",
            "Self Type Usage", "Self Type Checking", "Error Recovery", "Runtime Organization",
            "Activations", "Activation Records", "Globals and Heap", "Alignment", "Stack Machines",
            "Introduction to Code Generation", "Code Generation I", "Code Generation II",
            "Code Generation Example", "Temporaries", "Object Layout", "Semantics Overview",
            "Operational Semantics", "Cool Semantics I", "Cool Semantics II", "Intermediate Code",
            "Optimization Overview", "Local Optimization", "Peephole Optimization",
            "Dataflow Analysis", "Constant Propagation", "Analysis of Loops", "Orderings",
            "Liveness Analysis", "Register Allocation", "Graph Coloring", "Spilling",
            "Managing Caches", "Automatic Memory Management", "Mark and Sweep", "Stop and Copy",
            "Conservative Collection", "Reference Counting", "Java", "Java Arrays",
            "Java Exceptions", "Java Interfaces", "Java Coercions", "Java Threads",
            "Other Topics", "DeduceIt Demo",
        ])
    ],
    "CS144": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Video {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Error detection", "8DRD-vQam60"), ("Finite state machines 1", "FYNk9VrMWwc"),
            ("Transport (intro)", "1CP6aF09OjI"), ("TCP service model", "l3AhPe4WK0E"),
            ("UDP service model", "umqdobwwbFc"), ("ICMP service model", "LSobIghyLGU"),
            ("End to End Principle", "mZcthYLpF9Q"), ("Transport (recap)", "vtJ2JzhWTsk"),
            ("Congestion Control", "nh970YyKRDA"), ("AIMD Multiple Flows", "OAHga4mQr_A"),
            ("Congestion Control (cont.)", "JMm2vDkCUJg"), ("Routing", "yfIyxDhhWHU"),
            ("Routing (cont.)", "VJoYi6UZiCg"), ("Security", "LHbynG7iYEY"),
            ("Introduction to Network Security", "SERez34ww5c"), ("Layer 2 Attacks", "GkqPLrCqkeo"),
            ("MAC Overflow Attack", "YC_oLgYd_qU"), ("DHCP Attack Demo", "_eW_SDyhj-U"),
            ("Layer 3 Attacks", "6vudh-STvBM"), ("Security Principles", "LxtJoXxeDyE"),
            ("Confidentiality", "Pr_vrfRYuvQ"), ("Integrity", "sRBuAB0reNY"),
            ("Public Key Cryptography", "aSh16igtLf4"), ("Certificates", "gQ33dMv1aJ8"),
            ("TLS", "gsLEz6sRPr8"), ("Security (wrap-up)", "CxuyR9G1HwA"),
            ("Nandita Interview", "OVhJEn3cu5M"), ("BGP: Putting the Inter in Internet", "HAhzj1E1ejI"),
            ("Sanjit Biswas Interview", "pHULhFc8pwA"), ("Reed Hundt on security and openness", "0jwuR8YANIk"),
        ])
    ],
    "CS149": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Why Parallelism? Why Efficiency?", "V1tINV2-9p4"),
            ("A Modern Multi-Core Processor", "CKmNpAO5rS4"),
            ("Multi-core Arch Part II + ISPC Programming Abstractions", "F4bVSyz_jxo"),
            ("Parallel Programming Basics", "0-ztm8SKq70"),
            ("Performance Optimization I: Work Distribution and Scheduling", "mmO2Ri_dJkk"),
            ("Performance Optimization II: Locality, Communication, and Contention", "Mhdny2JNhmc"),
            ("GPU architecture and CUDA Programming", "qQTDF0CBoxE"),
            ("Data-Parallel Thinking", "Ba3TqxSgnTk"),
            ("Distributed Data-Parallel Computing Using Spark", "jaMWmLq422U"),
            ("Efficiently Evaluating DNNs on GPUs", "qbKtU0X6-WU"),
            ("Cache Coherence", "lrCfG2CPDEw"), ("Memory Consistency", "nFXWmo9MFiY"),
            ("Fine-Grained Synchronization and Lock-Free Programming", "GA1ObImqaMo"),
            ("Midterm Review", "nHPKVtLz5Ko"),
            ("Domain Specific Programming Languages", "sRuyBNxCkGQ"),
            ("Transactional Memory 1", "rFFf3WIJ7BA"), ("Transactional Memory 2", "Tbk1vnYLQqI"),
            ("Hardware Specialization", "2tAb3EgyjNw"),
            ("Accessing Memory + Course Wrap Up", "J7v_ubArrno"),
        ])
    ],
    "CS154": [
        {"lecture": i+1, "title": t, "videos": vids}
        for i, (t, vids) in enumerate([
            ("Introduction & Mathematical Foundations", [{"title": "What is Computing?", "type": "youtube", "id": "YzKmKcBHogg"}, {"title": "Course Curriculum", "type": "youtube", "id": "SrXZPzgJ3Jc"}, {"title": "Proofs", "type": "youtube", "id": "FSf7KnMR4Is"}]),
            ("Deterministic Finite Automata", [{"title": "DFA Overview", "type": "youtube", "id": "-PJY5bHl_HA"}, {"title": "DFA Deep Dive", "type": "youtube", "id": "mQqB7KER3r8"}, {"title": "DFA Closure Properties", "type": "youtube", "id": "VDUs9g6rU7E"}]),
            ("Nondeterminism & Regular Expressions", [{"title": "NFA Introduction", "type": "youtube", "id": "n_EG8J-VFJ4"}, {"title": "NFA to DFA Conversion", "type": "youtube", "id": "AsAb2BiUw8c"}, {"title": "DFA Closure Properties II", "type": "youtube", "id": "ukk9ZL3_Ff4"}, {"title": "Regular Expressions", "type": "youtube", "id": "9NMfJNDoZhQ"}]),
            ("Non-Regular Languages", [{"title": "Pumping Lemma", "type": "youtube", "id": "4XRR3UurDoQ"}, {"title": "DFA Minimization", "type": "youtube", "id": "WzrXOMw_cEI"}, {"title": "Myhill-Nerode Theorem", "type": "youtube", "id": "BJOABHS_OuM"}]),
            ("DFA Learning & Streaming", [{"title": "Learning DFAs", "type": "youtube", "id": "85QZN45-CoQ"}, {"title": "Streaming Algorithms", "type": "youtube", "id": "0xXV1jALAdQ"}]),
            ("Communication Complexity", [{"title": "Communication Complexity", "type": "youtube", "id": "6iNbuivj1ZA"}]),
            ("Turing Machines", [{"title": "TM Overview", "type": "youtube", "id": "DRBDcMAB2qg"}, {"title": "Turing Machines", "type": "youtube", "id": "dope-PGUbUM"}, {"title": "TM Variants", "type": "youtube", "id": "Fz1hBSZC5mY"}, {"title": "Universal TM", "type": "youtube", "id": "hFbnLn4bD58"}]),
            ("Undecidability", [{"title": "Counting Argument", "type": "youtube", "id": "T0RJqD_yTLs"}, {"title": "Concrete Undecidable Problems", "type": "youtube", "id": "S3bYfIAdEmM"}, {"title": "Mapping Reductions", "type": "youtube", "id": "_0163dZIBvw"}]),
            ("Rice's Theorem & Oracle Reductions", [{"title": "Rice's Theorem", "type": "youtube", "id": "KHMyz1pAWg8"}, {"title": "Oracle Reductions", "type": "youtube", "id": "-EBYph6R1eI"}, {"title": "Self-Reference", "type": "youtube", "id": "vUHmltEPXIk"}]),
            ("Logic & Kolmogorov Complexity", [{"title": "Logic", "type": "youtube", "id": "KBhoU7sfR3k"}, {"title": "Kolmogorov Complexity", "type": "youtube", "id": "PwNIDjc9cYc"}]),
            ("Time Complexity & NP", [{"title": "Complexity Overview", "type": "youtube", "id": "r6lW-3Rttb0"}, {"title": "Time Complexity", "type": "youtube", "id": "SqG_D1Mp5CY"}, {"title": "Introduction to NP", "type": "youtube", "id": "ioq7srEOWvw"}]),
            ("NP-Completeness", [{"title": "Polynomial-Time Reductions", "type": "youtube", "id": "mYwVCePIzG8"}, {"title": "Cook-Levin Theorem", "type": "youtube", "id": "-lLBjGmVqNY"}, {"title": "More NP-Complete Problems", "type": "youtube", "id": "Ds5LKk73oZQ"}]),
            ("Beyond NP", [{"title": "co-NP", "type": "youtube", "id": "LbLP_wIAJe4"}, {"title": "Polynomial Hierarchy", "type": "youtube", "id": "IS1A0N1EF2o"}]),
            ("Space Complexity", [{"title": "Space Complexity", "type": "youtube", "id": "fvNeT3n8Ubk"}, {"title": "Interactive Proofs", "type": "youtube", "id": "1XF9V-5YrIE"}]),
            ("Advanced Topics", [{"title": "Algorithmic Fairness", "type": "youtube", "id": "YjRS91Mv-f4"}, {"title": "Randomness", "type": "youtube", "id": "jmSSkC7yVog"}, {"title": "Parting Thoughts", "type": "youtube", "id": "gt_pqWJy210"}]),
        ])
    ],
    "CS231N": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction", "2fq9wYslV0A"), ("Image Classification with Linear Classifiers", "pdqofxJeBN8"),
            ("Regularization and Optimization", "dyNGd06MWn4"), ("Neural Networks and Backpropagation", "25zD5qJHYsk"),
            ("Image Classification with CNNs", "f3g1zGdxptI"), ("CNN Architectures", "aVJy4O5TOk8"),
            ("Recurrent Neural Networks", "kG2lAPBF7zA"), ("Attention and Transformers", "RQowiOF_FvQ"),
            ("Object Detection, Image Segmentation, Visualizing", "PTypu6GqEd4"),
            ("Video Understanding", "wElqklprhPE"), ("Large Scale Distributed Training", "9MvD-XsowsE"),
            ("Self-Supervised Learning", "4howBU7THbM"), ("Generative Models 1", "zbHXQRUNlH0"),
            ("Generative Models 2", "Edr4uZFh4EE"), ("3D Vision", "7lxrKDKtykM"),
            ("Vision and Language", "mQOK0Mfyrkk"), ("Robot Learning", "XSfmOH_xVSU"),
            ("Human-Centered AI", "g8UaBfj6Sh8"),
        ])
    ],
    "CS234": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction to Reinforcement Learning", "WsvFL-LjA6U"), ("Tabular MDP Planning", "gHdsUUGcBC0"),
            ("Policy Evaluation", "jjq51TRNVvk"), ("Q Learning and Function Approximation", "b_wvosA70f8"),
            ("Policy Search 1", "L6OVEmV3NcE"), ("Policy Search 2", "8PwvNQ5WS-o"),
            ("Policy Search 3", "4ngb0IZTg8I"), ("Offline RL 1", "IEbuJtjqtMU"),
            ("Guest Lecture on DPO", "Q7rl8ovBWwQ"), ("Offline RL 3", "F6APGIAm5fw"),
            ("Exploration 1", "sqYii3nd78w"), ("Exploration 2", "gFJNsfg_35E"),
            ("Exploration 3", "pc7oayCSZmQ"), ("Multi-Agent Game Playing", "UgANzoWc0nc"),
            ("RL Applications", "FOlPpjNbHjE"), ("Value Alignment", "eenJzay5aLo"),
        ])
    ],
    "CS238": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Video {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Validation of Safety Critical Systems I Explainability", "_U0EUX2E3k0"),
            ("The Internal Details of TeX82 - Session 12", "eKttYyTf_30"),
            ("The Internal Details of TeX82 - Session 11", "eotEOydYrco"),
            ("The Internal Details of TeX82 - Session 10", "Uf3vpKWpu7A"),
            ("The Internal Details of TeX82 - Session 9", "gza2a-JuWJg"),
            ("The Internal Details of TeX82 - Session 8", "BMq3cCQ8ysQ"),
            ("The Internal Details of TeX82 - Session 7", "nLJnNZxLEnk"),
            ("The Internal Details of TeX82 - Session 6", "mxOZ-fSvr9Y"),
            ("The Internal Details of TeX82 - Session 5", "WiHIOn1bemg"),
            ("The Internal Details of TeX82 - Session 4", "9astSKJdsV0"),
            ("The Internal Details of TeX82 - Session 2", "3RDtSdN7jPI"),
            ("The Internal Details of TeX82 - Session 3", "7B_9keAK6Qk"),
            ("The Internal Details of TeX82 - Session 1", "kAk9GBVKsgk"),
            ("Bayesian Structure Learning", "FfT5VTfHj_s"),
            ("Online Planning and Policy Search", "iLMzsV0JOHk"),
            ("Machine Learning from Human Preferences I Guest Lecture", "HFrCySzH9QI"),
            ("Policy Gradient Estimation & Optimization", "PgPNfPhG4Wc"),
            ("Linear Constrained Optimization", "gmdrc9vGnJ0"),
            ("Policy Gradient Estimation and Optimization", "-at-usqAIMc"),
            ("Pi and The Art of Computer Programming", "3DKo219ZHMw"),
        ])
    ],
    "CS155": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "youtube", "id": vid}]}
        for i, (t, vid) in enumerate([
            ("Introduction, Threat Models", "GqmQg-cszw4"), ("Control Hijacking Attacks", "r4KjHEgg9Wg"),
            ("Buffer Overflow Exploits and Defenses", "xSQxaie_h1o"), ("Privilege Separation", "dNl22h1kW1k"),
            ("Capabilities", "TQhmua7Z2cY"), ("Sandboxing Native Code", "I0Psvvky-44"),
            ("Web Security Model", "eRJ_r8WF1Y0"), ("Securing Web Applications", "WlmKwIe9z1Q"),
            ("Symbolic Execution", "yRVZPvHYHzw"), ("Ur/Web", "XMEFdofERLI"),
            ("Network Security", "BZTWXl9QNK8"), ("Network Protocols", "QOtA76ga_fY"),
            ("SSL and HTTPS", "q1OF_0ICt9A"), ("Medical Software", "bA3xCpYLA34"),
            ("Side-Channel Attacks", "3v5Von-oNUg"), ("User Authentication", "MT7X17ZRo1U"),
            ("Private Browsing", "YTWXAFJf8bw"), ("Anonymous Communication", "OgGTJIgNewE"),
            ("Mobile Phone Security", "uT7BXusDgDM"), ("Data Tracking", "WG5UbMrUiLU"),
            ("Guest Lecture by MIT IS&T", "2PO8h1pVW50"), ("Security Economics", "8PdnOZI7H5E"),
        ])
    ],
    "CS240": [
        {"lecture": i+1, "title": t, "videos": [{"title": f"Lecture {i+1}", "type": "internet_archive", "archive_id": aid}]}
        for i, (t, aid) in enumerate([
            ("What is an Operating System?", "ucberkeley_webcast_ToySNfwFOyc"),
            ("TDD (Test-Driven Design), BDD (Behavior-Driven Design), and all that", "ucberkeley_webcast_f9Fr7y5FJ94"),
            ("OS Structure: Monolithic, Microkernel, Exokernel, Multikernel", "ucberkeley_webcast_5bwLaaP4weo"),
            ("OS Structure (cont.): Modern Architecture", "ucberkeley_webcast_34QM3PLk_Lo"),
            ("Processes, Fork, Exec, Interprocess Communication/Optimization", "ucberkeley_webcast_cBZE8Id2vlI"),
            ("Parallelism and Synchronization", "ucberkeley_webcast_XlFv3t5Hy28"),
            ("Synchronization and Scheduling Review", "ucberkeley_webcast_oEdqyWM_30o"),
            ("Synchronization Approaches", "ucberkeley_webcast_wCFhmu2Csxk"),
            ("Synchronization (cont.), Scheduling Review", "ucberkeley_webcast_aK2wUT251aA"),
            ("Scheduling (cont.), Real-Time Scheduling", "ucberkeley_webcast_hYl_i9iK3pw"),
            ("Scheduling (cont.), Real-Time Scheduling", "ucberkeley_webcast_PavfiyTgqAs"),
            ("Dominant Resource Fairness (DRF), Two-Level Scheduling", "ucberkeley_webcast_nBOwIkNu3q0"),
            ("Two-Level Scheduling (cont.), Segmentation/Paging/Virtual Memory", "ucberkeley_webcast_s7TNsvbq9tI"),
            ("Segmentation, Paging, Virtual Memory", "ucberkeley_webcast_lOhENu_LY7U"),
            ("Virtual Memory and Paging", "ucberkeley_webcast_gh90w5pItf8"),
            ("Virtual Memory and Paging (cont.), Devices", "ucberkeley_webcast_foz4oaErIFw"),
            ("Device Drivers: Slab Allocator", "ucberkeley_webcast_-QI3Nc_Ymjg"),
            ("Device Drivers (cont.): IO Buses, Interrupts, Device Driver Structure", "ucberkeley_webcast_xXb_Wt-DBKU"),
            ("Disk Modeling, File Systems Intro", "ucberkeley_webcast_uJnakBXap9M"),
            ("File Systems (cont.): Reliability, Journaling, Durability, Scheduling", "ucberkeley_webcast_eeU1K2gB5Ig"),
            ("File Systems (cont.): Distributed Storage, File Cache, Virtual Filesystem Switch", "ucberkeley_webcast_JoOTk3Y6TQw"),
            ("Distributed File Systems (cont.): VFS Layer, Application-Specific File Systems", "ucberkeley_webcast_4oPjQdT07EY"),
            ("Application-Specific File Systems, Deep Archival Storage", "ucberkeley_webcast_hBrNyhyH7rk"),
            ("Security and Protection (cont.)", "ucberkeley_webcast_TlF4F6eZeUg"),
            ("The Swarm, Extreme Distributed Storage, Quantum Computing", "ucberkeley_webcast_AAlJtNKU1LQ"),
        ])
    ],
}

def lookup_lectures(code):
    key = code.replace(" ", "").replace("-", "").upper()
    return lectures_data.get(key, [])

output = {"courses": []}

all_levels = [
    ("Beginner", beginner_courses),
    ("Intermediate", intermediate_courses),
    ("Advanced", advanced_courses),
    ("Expert", expert_courses),
]

for level, courses in all_levels:
    has_track = len(courses[0]) > 2 if courses else False
    for c in courses:
        entry = {
            "code": c["code"],
            "title": c["title"],
            "level": level,
            "category": c["category"],
            "lectures": lookup_lectures(c["code"]),
        }
        if has_track and "track" in c:
            entry["track"] = c["track"]
        output["courses"].append(entry)

out_path = os.path.join(os.path.dirname(__file__), "courses_data.json")
with open(out_path, "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Done. Total courses: {len(output['courses'])}")
for course in output["courses"]:
    lec_count = len(course.get("lectures", []))
    vid_count = sum(len(lec.get("videos", [])) for lec in course.get("lectures", []))
    track = f" [{course.get('track', '')}]" if course.get('track') else ""
    print(f"  [{course['level']}]{track} {course['code']} - {course['title']}: {lec_count} lectures, {vid_count} videos")
