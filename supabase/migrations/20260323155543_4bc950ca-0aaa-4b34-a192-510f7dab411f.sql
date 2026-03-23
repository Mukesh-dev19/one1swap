
-- Create update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  college TEXT,
  campus TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Resources table
CREATE TABLE public.resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT,
  type TEXT NOT NULL CHECK (type IN ('Sell', 'Exchange', 'Share')),
  price INTEGER DEFAULT 0,
  location TEXT,
  images TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resources viewable by everyone" ON public.resources FOR SELECT USING (true);
CREATE POLICY "Users can insert own resources" ON public.resources FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own resources" ON public.resources FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own resources" ON public.resources FOR DELETE USING (auth.uid() = user_id);

CREATE TRIGGER update_resources_updated_at BEFORE UPDATE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Resource requests table (first come first served)
CREATE TABLE public.resource_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.resource_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Requests viewable by resource owner and requester" ON public.resource_requests
  FOR SELECT USING (
    auth.uid() = user_id OR
    auth.uid() IN (SELECT r.user_id FROM public.resources r WHERE r.id = resource_id)
  );
CREATE POLICY "Authenticated users can create requests" ON public.resource_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Resource owner can update request status" ON public.resource_requests
  FOR UPDATE USING (auth.uid() IN (SELECT r.user_id FROM public.resources r WHERE r.id = resource_id));

-- Messages table for real-time chat
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages" ON public.messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Receiver can update read status" ON public.messages
  FOR UPDATE USING (auth.uid() = receiver_id);

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.resource_requests;

-- Storage bucket for resource images
INSERT INTO storage.buckets (id, name, public) VALUES ('resource-images', 'resource-images', true);

CREATE POLICY "Resource images publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'resource-images');
CREATE POLICY "Authenticated users can upload resource images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'resource-images' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete own resource images" ON storage.objects FOR DELETE USING (bucket_id = 'resource-images' AND auth.uid()::text = (storage.foldername(name))[1]);
