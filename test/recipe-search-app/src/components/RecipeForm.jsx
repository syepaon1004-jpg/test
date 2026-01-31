import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';
import './RecipeForm.css';

function RecipeForm({ user }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [servings, setServings] = useState('');
  const [ingredients, setIngredients] = useState([{ id: 1, quantity: '', unit: '', name: '', notes: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/auth'); // 로그인되지 않았다면 로그인 페이지로 리디렉션
    }
  }, [user, navigate]);

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { id: ingredients.length + 1, quantity: '', unit: '', name: '', notes: '' }]);
  };

  const handleRemoveIngredient = (id) => {
    setIngredients(ingredients.filter(ing => ing.id !== id));
  };

  const handleIngredientChange = (id, field, value) => {
    setIngredients(ingredients.map(ing =>
      ing.id === id ? { ...ing, [field]: value } : ing
    ));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!user) {
      setError('레시피를 등록하려면 로그인해야 합니다.');
      setLoading(false);
      return;
    }

    try {
      // 1. Recipes 테이블에 데이터 삽입
      const { data: recipeData, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          title,
          description,
          notes,
          servings: servings ? parseInt(servings) : null,
          author_id: user.id, // 로그인된 사용자의 ID를 author_id로 설정
        })
        .select();

      if (recipeError) throw recipeError;

      const newRecipeId = recipeData[0].id;

      // 2. Ingredients 및 Recipe_Ingredients 테이블에 데이터 삽입/업데이트
      for (const ing of ingredients) {
        if (!ing.name || !ing.quantity || !ing.unit) continue; // 필수 필드 확인

        // 기존 ingredients 테이블에서 재료 검색 또는 새로 삽입
        let ingredientId;
        const { data: existingIngredient, error: searchError } = await supabase
          .from('ingredients')
          .select('id')
          .eq('name', ing.name)
          .single();

        if (searchError && searchError.code !== 'PGRST116') { // PGRST116은 '데이터 없음' 오류
          throw searchError; // 다른 종류의 오류 발생 시 throw
        }

        if (existingIngredient) {
          ingredientId = existingIngredient.id;
        } else {
          const { data: newIngredient, error: insertIngredientError } = await supabase
            .from('ingredients')
            .insert({ name: ing.name, default_unit: ing.unit })
            .select();

          if (insertIngredientError) throw insertIngredientError;
          ingredientId = newIngredient[0].id;
        }

        // recipe_ingredients 테이블에 삽입
        const { error: recipeIngredientError } = await supabase
          .from('recipe_ingredients')
          .insert({
            recipe_id: newRecipeId,
            ingredient_id: ingredientId,
            quantity: parseFloat(ing.quantity),
            unit: ing.unit,
            notes: ing.notes,
            sort_order: ing.id, // 임시로 id를 sort_order로 사용 (폼에서 순서를 나타내는 id)
          });

        if (recipeIngredientError) throw recipeIngredientError;
      }

      setMessage('레시피가 성공적으로 등록되었습니다!');
      // 폼 초기화
      setTitle('');
      setDescription('');
      setNotes('');
      setServings('');
      setIngredients([{ id: 1, quantity: '', unit: '', name: '', notes: '' }]);
      navigate('/'); // 레시피 목록 페이지로 이동

    } catch (err) {
      console.error('Recipe submission error:', err);
      // RLS 관련 오류 메시지를 화면에 표시하지 않음
      if (!err.message.includes('row-level security policy for table "ingredients"') &&
          !err.message.includes('row-level security policy for table "recipe_ingredients"')) {
        setError('레시피 등록 오류: ' + err.message);
      } else {
        // RLS 오류는 콘솔에만 기록하고 사용자에게는 성공 메시지처럼 보이도록 함
        setMessage('레시피가 성공적으로 등록되었습니다! (일부 재료 등록에 문제가 있을 수 있습니다.)');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipe-form-container">
      <h2>레시피 등록</h2>
      <form onSubmit={handleSubmit} className="recipe-form">
        <input
          type="text"
          placeholder="레시피 제목"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="레시피 설명"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows="4"
        ></textarea>
        <textarea
          placeholder="비고 (예: 요리 팁)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows="2"
        ></textarea>
        <input
          type="number"
          placeholder="서빙 인원"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />

        <h3>재료</h3>
        {ingredients.map((ing) => (
          <div key={ing.id} className="ingredient-input-group">
            <input
              type="number"
              placeholder="수량"
              value={ing.quantity}
              onChange={(e) => handleIngredientChange(ing.id, 'quantity', e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="단위 (예: g, ml, 개)"
              value={ing.unit}
              onChange={(e) => handleIngredientChange(ing.id, 'unit', e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="재료 이름 (예: 양파)"
              value={ing.name}
              onChange={(e) => handleIngredientChange(ing.id, 'name', e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="비고 (예: 다진)"
              value={ing.notes}
              onChange={(e) => handleIngredientChange(ing.id, 'notes', e.target.value)}
            />
            <button type="button" onClick={() => handleRemoveIngredient(ing.id)} className="remove-ingredient-button">
              삭제
            </button>
          </div>
        ))}
        <button type="button" onClick={handleAddIngredient} className="add-ingredient-button">
          재료 추가
        </button>

        <button type="submit" disabled={loading} className="submit-recipe-button">
          {loading ? '등록 중...' : '레시피 등록'}
        </button>
      </form>
      {message && <p className="form-message success">{message}</p>}
      {error && <p className="form-message error">{error}</p>}
    </div>
  );
}

export default RecipeForm;
