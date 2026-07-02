/**
 * CoursePage — fetches course data and renders CoursePlayer.
 * Requires authentication (redirects to /login if not logged in).
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CoursePlayer } from '../courses/CoursePlayer';
import { coursesApi, type CourseDetail } from '../courses/api';
import { useCourseProgress } from '../courses/useCourseProgress';
import { useAuth } from '../auth/useAuth';

export function CoursePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [courseLoading, setCourseLoading] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    }
  }, [authLoading, user, navigate]);

  // Fetch course data
  useEffect(() => {
    if (!slug || !user) return;
    let cancelled = false;
    (async () => {
      setCourseLoading(true);
      const { status, data } = await coursesApi.get(slug);
      if (cancelled) return;
      if (status === 200 && 'course' in data) {
        setCourse((data as { course: CourseDetail }).course);
        setLoadError(null);
      } else {
        setLoadError('课程不存在');
      }
      setCourseLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, user]);

  // Call hook unconditionally — hooks must never be inside conditional branches.
  // Guard against missing course data inside the component return.
  const progress = useCourseProgress(slug ?? '', course?.steps.length ?? 0);

  if (authLoading || courseLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (loadError || !course) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-error">{loadError ?? '加载失败'}</p>
        <button onClick={() => navigate('/')} className="btn btn-ghost btn-sm">返回首页</button>
      </div>
    );
  }

  if (progress.isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  return <CoursePlayer steps={course.steps} progress={progress} />;
}
