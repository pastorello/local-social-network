from .models import Notification

from posts.models import Post

def create_notification(request, type_of_notification, post_id=None, friendrequest_id=None):
    created_for = None

    if type_of_notification == 'post_like':
        body = f'{request.user.name} liked one of your posts!'
        post = Post.objects.get(pk=post_id)
        created_for = post.created_by
    elif type_of_notification == 'post_comment':
        body = f'{request.user.name} commented on one of your posts!'
        post = Post.objects.get(pk=post_id)
        created_for = post.created_by

    notification = Notification.objects.create(
        body=body,
        type_of_notification=type_of_notification,
        created_by=request.user,
        post_id=post_id,
        created_for=created_for
    )

    return notification