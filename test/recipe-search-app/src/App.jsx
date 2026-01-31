import { useState, useEffect, useRef } from 'react';
import { supabase } from './supabaseClient.js';
import { Routes, Route, Link, useNavigate } from 'react-router-dom';
import Auth from './components/Auth.jsx';
import RecipeForm from './components/RecipeForm.jsx';
import './App.css';

// 기존 App 컴포넌트의 검색 및 상세 로직을 RecipeSearch 컴포넌트로 분리
function RecipeSearch({ searchTerm, setSearchTerm, recipes, setRecipes, loading, error, selectedRecipe, setSelectedRecipe, suggestions, setSuggestions, showSuggestions, setShowSuggestions, handleSearch, getRecipeImageUrl, handleBackToSearch, getSortedIngredients, searchBarRef, fetchSuggestions }) {
  return (
    <>
      <div className="search-bar-container" ref={searchBarRef}>
        <div className="search-bar">
          <input
            type="text"
            placeholder="레시피 제목 또는 설명 검색..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              fetchSuggestions(e.target.value);
            }}
            onFocus={() => searchTerm.length >= 2 && suggestions.length > 0 && setShowSuggestions(true)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              }
            }}
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? (
              '검색 중...'
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-search">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                검색
              </>
            )}
          </button>
        </div>

        {showSuggestions && suggestions.length > 0 && (
          <ul className="autocomplete-dropdown">
            {suggestions.map((suggestion, index) => (
              <li
                key={index}
                className="suggestion-item"
                onClick={() => {
                  setSearchTerm(suggestion);
                  handleSearch();
                  setShowSuggestions(false);
                }}
              >
                {suggestion}
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="error-message">{error}</p>}

      {selectedRecipe ? (
        <div className="recipe-detail">
          <button onClick={handleBackToSearch} className="back-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-arrow-left">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            뒤로가기
          </button>
          <img src={getRecipeImageUrl(selectedRecipe.id)} alt={selectedRecipe.title} className="recipe-detail-image" />
          <h2>{selectedRecipe.title}</h2>
          <p><strong>설명:</strong> {selectedRecipe.description}</p>
          {selectedRecipe.notes && <p><strong>비고:</strong> {selectedRecipe.notes}</p>}
          {selectedRecipe.servings && <p><strong>서빙:</strong> {selectedRecipe.servings}인분</p>}

          {getSortedIngredients(selectedRecipe.recipe_ingredients).length > 0 && (
            <div className="ingredients-list">
              <h3>재료:</h3>
              <ul>
                {getSortedIngredients(selectedRecipe.recipe_ingredients).map((ingredient) => (
                  <li key={ingredient.id}>
                    {ingredient.quantity} {ingredient.unit} {ingredient.ingredients ? ingredient.ingredients.name : '알 수 없음'}
                    {ingredient.notes && ` (${ingredient.notes})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="recipe-list">
          {recipes.length > 0 ? (
            recipes.map((recipe) => (
              <div key={recipe.id} className="recipe-card" onClick={() => setSelectedRecipe(recipe)}>
                <img src={getRecipeImageUrl(recipe.id)} alt={recipe.title} className="recipe-card-image" />
                <h2>{recipe.title}</h2>
                <p>{recipe.description}</p>
                {recipe.notes && <p><strong>비고:</strong> {recipe.notes}</p>}
                {recipe.servings && <p><strong>서빙:</strong> {recipe.servings}인분</p>}
              </div>
            ))
          ) : (
            !loading && <p>검색 결과가 없습니다. 새로운 레시피를 검색해 보세요.</p>
          )}
        </div>
      )}
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/auth');
  };

  // RecipeSearch 컴포넌트로 전달할 상태 및 함수들
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchBarRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchBarRef.current && !searchBarRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [searchBarRef]);

  const fetchSuggestions = async (query) => {
    if (query.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('title')
        .ilike('title', `%${query}%`)
        .limit(5);

      if (error) {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      } else {
        setSuggestions(data.map(recipe => recipe.title));
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
      setSuggestions([]);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    setSelectedRecipe(null);
    setSuggestions([]);
    setShowSuggestions(false);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          recipe_ingredients (
            id, quantity, unit, notes, sort_order,
            ingredients (name)
          )
        `)
        .or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
        .order('sort_order', { foreignTable: 'recipe_ingredients', ascending: true });

      if (error) {
        throw error;
      }
      setRecipes(data);
    } catch (err) {
      setError('레시피를 불러오는 중 오류가 발생했습니다: ' + err.message);
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const getRecipeImageUrl = (id) => {
    return `https://source.unsplash.com/random/400x200/?food,${id}`;
  };

  const handleBackToSearch = () => {
    setSelectedRecipe(null);
  };

  const getSortedIngredients = (ingredients) => {
    if (!ingredients) return [];
    return [...ingredients].sort((a, b) => b.sort_order - a.sort_order);
  };

  return (
    <div className="App">
      <nav className="navbar">
        <Link to="/" className="nav-brand">맛있는 레시피 찾기</Link>
        <div className="nav-links">
          <Link to="/" className="nav-item">레시피 검색</Link>
          {user ? (
            <>
              <Link to="/add-recipe" className="nav-item">레시피 등록</Link>
              <button onClick={handleLogout} className="nav-item nav-button">로그아웃</button>
            </>
          ) : (
            <Link to="/auth" className="nav-item">로그인 / 회원가입</Link>
          )}
        </div>
      </nav>

      <Routes>
        <Route path="/" element={
          <>
            <h1>레시피 검색</h1>
            <RecipeSearch
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              recipes={recipes}
              setRecipes={setRecipes}
              loading={loading}
              error={error}
              selectedRecipe={selectedRecipe}
              setSelectedRecipe={setSelectedRecipe}
              suggestions={suggestions}
              setSuggestions={setSuggestions}
              showSuggestions={showSuggestions}
              setShowSuggestions={setShowSuggestions}
              handleSearch={handleSearch}
              getRecipeImageUrl={getRecipeImageUrl}
              handleBackToSearch={handleBackToSearch}
              getSortedIngredients={getSortedIngredients}
              searchBarRef={searchBarRef}
              fetchSuggestions={fetchSuggestions}
            />
          </>
        } />
        <Route path="/auth" element={<Auth user={user} />} />
        <Route path="/add-recipe" element={<RecipeForm user={user} />} />
      </Routes>
    </div>
  );
}

export default App;
